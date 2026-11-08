import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { CampusHub, CampusHubSchema } from "@skillx/shared-contracts";
import { Theme } from "../constants/theme";

interface CampusHubPickerProps {
  selectedHub: CampusHub;
  onSelectHub: (hub: CampusHub) => void;
}

const hubs = CampusHubSchema.options;

export function CampusHubPicker({ selectedHub, onSelectHub }: CampusHubPickerProps) {
  return (
    <View style={styles.grid}>
      {hubs.map((hub) => {
        const isSelected = selectedHub === hub;
        return (
          <TouchableOpacity
            key={hub}
            onPress={() => onSelectHub(hub)}
            activeOpacity={0.7}
            style={[styles.item, isSelected && styles.itemSelected]}
          >
            <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
              {hub}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6
  },
  item: {
    width: "48%",
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  itemSelected: {
    backgroundColor: Theme.colors.accentLight,
    borderColor: Theme.colors.accent,
    borderWidth: 1.5
  },
  itemText: {
    fontSize: 11,
    fontWeight: "600",
    color: Theme.colors.text,
    textAlign: "center"
  },
  itemTextSelected: {
    color: Theme.colors.accent,
    fontWeight: "800"
  }
});
