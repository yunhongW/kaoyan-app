import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, shadows, typography } from "../theme";

const examples = ["背了肖四", "做了2019真题", "复习了高数", "背了单词", "看了网课"];

export default function NoteModal({ visible, subject, onConfirm, onCancel }) {
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    if (visible) setNoteText("");
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, shadows.lg]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>学习备注</Text>
            <TouchableOpacity onPress={onCancel}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: spacing.xl }}>
            <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.md }}>
              {subject} - 记录一下学了什么
            </Text>
            <TextInput
              style={styles.customInput}
              placeholder="例如：背了肖四第三章"
              value={noteText}
              onChangeText={setNoteText}
              autoFocus
              maxLength={100}
              returnKeyType="done"
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg }}>
              {examples.map((ex) => (
                <TouchableOpacity
                  key={ex}
                  style={styles.noteExample}
                  onPress={() => setNoteText(ex)}
                >
                  <Text style={styles.noteExampleText}>{ex}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.customBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                <Text style={styles.cancelBtnText}>跳过</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={() => onConfirm(noteText.trim())}>
                <Text style={styles.confirmBtnText}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modal: {
    backgroundColor: colors.card, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl,
    maxHeight: "70%", paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  modalTitle: { ...typography.h3, color: colors.text },
  customInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    ...typography.body, marginBottom: spacing.lg,
  },
  customBtns: { flexDirection: "row", gap: spacing.md, justifyContent: "flex-end" },
  cancelBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  cancelBtnText: { ...typography.body, color: colors.textSecondary },
  confirmBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  confirmBtnText: { ...typography.bodyBold, color: colors.textInverse },
  noteExample: { backgroundColor: colors.accentLight, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  noteExampleText: { fontSize: 12, color: colors.accentDark },
});
