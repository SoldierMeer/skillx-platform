import crypto from "crypto";
import mongoose, { ClientSession } from "mongoose";
import { User } from "../models/User";
import { Transaction, ITransaction } from "../models/Transaction";
import { WalletSummary, TokenTransaction } from "@skillx/shared-contracts";

export class InsufficientBalanceError extends Error {
  constructor(message = "Insufficient token balance") {
    super(message);
    this.name = "InsufficientBalanceError";
  }
}

export class EscrowBalanceError extends Error {
  constructor(message = "Insufficient escrow balance") {
    super(message);
    this.name = "EscrowBalanceError";
  }
}

export function generateTxId(): string {
  return `tx_${crypto.randomBytes(8).toString("hex")}`;
}

export async function lockTokensInEscrow(
  learnerId: string | mongoose.Types.ObjectId,
  tokenCost: number,
  sessionId: string | mongoose.Types.ObjectId,
  mongoSession: ClientSession
): Promise<ITransaction> {
  const learner = await User.findOneAndUpdate(
    { _id: learnerId, tokenBalance: { $gte: tokenCost } },
    {
      $inc: {
        tokenBalance: -tokenCost,
        escrowBalance: tokenCost
      }
    },
    { new: true, session: mongoSession }
  );

  if (!learner) {
    throw new InsufficientBalanceError(
      `Insufficient token balance. Requires ${tokenCost} token(s) to book session.`
    );
  }

  const [transaction] = await Transaction.create(
    [
      {
        transactionId: generateTxId(),
        type: "escrow_lock",
        amount: tokenCost,
        fromUser: learner._id,
        session: sessionId,
        status: "completed",
        description: `Locked ${tokenCost} token(s) in escrow for session booking`
      }
    ],
    { session: mongoSession }
  );

  return transaction;
}

export async function releaseEscrowToTutor(
  learnerId: string | mongoose.Types.ObjectId,
  tutorId: string | mongoose.Types.ObjectId,
  tokenCost: number,
  sessionId: string | mongoose.Types.ObjectId,
  mongoSession: ClientSession
): Promise<ITransaction> {
  const learner = await User.findOneAndUpdate(
    { _id: learnerId, escrowBalance: { $gte: tokenCost } },
    { $inc: { escrowBalance: -tokenCost } },
    { new: true, session: mongoSession }
  );

  if (!learner) {
    throw new EscrowBalanceError(
      `Learner has insufficient escrow balance (${tokenCost} required)`
    );
  }

  const tutor = await User.findOneAndUpdate(
    { _id: tutorId },
    { $inc: { tokenBalance: tokenCost } },
    { new: true, session: mongoSession }
  );

  if (!tutor) {
    throw new Error("Tutor not found for escrow release");
  }

  const [transaction] = await Transaction.create(
    [
      {
        transactionId: generateTxId(),
        type: "escrow_release",
        amount: tokenCost,
        fromUser: learner._id,
        toUser: tutor._id,
        session: sessionId,
        status: "completed",
        description: `Released ${tokenCost} token(s) from escrow to tutor upon verified session completion`
      }
    ],
    { session: mongoSession }
  );

  return transaction;
}

export async function refundEscrowToLearner(
  learnerId: string | mongoose.Types.ObjectId,
  tokenCost: number,
  sessionId: string | mongoose.Types.ObjectId,
  reason = "Session cancelled or rejected",
  mongoSession: ClientSession
): Promise<ITransaction> {
  const learner = await User.findOneAndUpdate(
    { _id: learnerId, escrowBalance: { $gte: tokenCost } },
    {
      $inc: {
        escrowBalance: -tokenCost,
        tokenBalance: tokenCost
      }
    },
    { new: true, session: mongoSession }
  );

  if (!learner) {
    throw new EscrowBalanceError(
      `Learner has insufficient escrow balance to refund (${tokenCost} required)`
    );
  }

  const [transaction] = await Transaction.create(
    [
      {
        transactionId: generateTxId(),
        type: "escrow_refund",
        amount: tokenCost,
        toUser: learner._id,
        session: sessionId,
        status: "completed",
        description: `Refunded ${tokenCost} token(s) to learner: ${reason}`
      }
    ],
    { session: mongoSession }
  );

  return transaction;
}

export async function getWalletSummary(userId: string): Promise<WalletSummary> {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const userObjId = new mongoose.Types.ObjectId(userId);

  // Aggregate total tokens earned as tutor (escrow releases to user)
  const earnedAgg = await Transaction.aggregate([
    { $match: { toUser: userObjId, type: "escrow_release", status: "completed" } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  const totalEarned = earnedAgg.length > 0 ? earnedAgg[0].total : 0;

  // Aggregate total tokens spent as learner (escrow releases from user)
  const spentAgg = await Transaction.aggregate([
    { $match: { fromUser: userObjId, type: "escrow_release", status: "completed" } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  const totalSpent = spentAgg.length > 0 ? spentAgg[0].total : 0;

  // Fetch recent 10 transactions involving this user
  const recentDocs = await Transaction.find({
    $or: [{ fromUser: userObjId }, { toUser: userObjId }]
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("fromUser", "name email")
    .populate("toUser", "name email");

  const recentTransactions: TokenTransaction[] = recentDocs.map((doc) => ({
    id: doc._id.toString(),
    transactionId: doc.transactionId,
    type: doc.type,
    amount: doc.amount,
    fromUser: doc.fromUser ? (doc.fromUser as any)._id?.toString() || doc.fromUser.toString() : undefined,
    toUser: doc.toUser ? (doc.toUser as any)._id?.toString() || doc.toUser.toString() : undefined,
    sessionId: doc.session?.toString(),
    status: doc.status,
    description: doc.description,
    createdAt: doc.createdAt.toISOString()
  }));

  return {
    tokenBalance: user.tokenBalance,
    escrowBalance: user.escrowBalance,
    totalEarned,
    totalSpent,
    recentTransactions
  };
}
