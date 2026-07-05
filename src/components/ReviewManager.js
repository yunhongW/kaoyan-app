import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  ScrollView, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as store from "../store";
import { colors, spacing, borderRadius, shadows, typography } from "../theme";

export default function ReviewManager({ visible, onClose }) {
  const [subjects, setSubjects] = useState([]);
  const [activeSubject, setActiveSubject] = useState("");
  const [reviewTopics, setReviewTopics] = useState([]);
  const [progress, setProgress] = useState({ totalChapters: 0, completedChapters: 0, pct: 0 });
  const [newTopicName, setNewTopicName] = useState("");
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [addChapterForTopic, setAddChapterForTopic] = useState(null);
  const [newChapterName, setNewChapterName] = useState("");

  useEffect(() => {
    if (visible) loadData();
  }, [visible]);

  async function loadData() {
    const subs = await store.getSubjects();
    setSubjects(subs);
    if (subs.length > 0 && !activeSubject) setActiveSubject(subs[0]);
    if (activeSubject) await loadSubject(activeSubject);
  }

  async function loadSubject(subj) {
    setActiveSubject(subj);
    const topics = await store.getReviewTopics();
    setReviewTopics(topics[subj] || []);
    const prog = await store.getReviewProgress(subj);
    setProgress(prog);
  }

  const handleAddTopic = async () => {
    if (!newTopicName.trim()) return;
    await store.addReviewTopicGroup(activeSubject, newTopicName.trim());
    setNewTopicName("");
    setShowAddTopic(false);
    await loadSubject(activeSubject);
  };

  const handleAddChapter = async (topicId) => {
    if (!newChapterName.trim()) return;
    await store.addChapter(activeSubject, topicId, newChapterName.trim());
    setNewChapterName("");
    setAddChapterForTopic(null);
    await loadSubject(activeSubject);
  };

  const handleToggle = async (topicId, chapterId) => {
    await store.toggleChapterComplete(activeSubject, topicId, chapterId);
    await loadSubject(activeSubject);
  };

  const handleDeleteTopic = (topicId) => {
    Alert.alert("删除专题", "确定要删除这个专题及其所有章节吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除", style: "destructive",
        onPress: async () => {
          await store.deleteReviewTopicGroup(activeSubject, topicId);
          await loadSubject(activeSubject);
        },
      },
    ]);
  };

  const handleDeleteChapter = (topicId, chapterId) => {
    Alert.alert("删除章节", "确定要删除这个章节吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除", style: "destructive",
        onPress: async () => {
          await store.deleteChapter(activeSubject, topicId, chapterId);
          await loadSubject(activeSubject);
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, shadows.lg]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>复习进度管理</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Subject tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
            {subjects.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.tab, activeSubject === s && styles.tabActive]}
                onPress={() => loadSubject(s)}
              >
                <Text style={[styles.tabText, activeSubject === s && styles.tabTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: spacing.xl }}>
            {/* Progress summary */}
            <View style={styles.progressRow}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress.pct}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {progress.completedChapters}/{progress.totalChapters} 章 ({progress.pct}%)
              </Text>
            </View>

            {/* Topic groups */}
            {reviewTopics.length === 0 ? (
              <Text style={styles.emptyText}>还没有添加复习专题，点击下方按钮开始</Text>
            ) : (
              reviewTopics.map((topic) => {
                const chapterDone = topic.chapters.filter((c) => c.completed).length;
                const chapterTotal = topic.chapters.length;
                return (
                  <View key={topic.id} style={styles.topicCard}>
                    <View style={styles.topicHeader}>
                      <Text style={styles.topicName}>{topic.name}</Text>
                      <Text style={styles.topicProgress}>
                        {chapterDone}/{chapterTotal}
                      </Text>
                      <TouchableOpacity onPress={() => handleDeleteTopic(topic.id)} style={{ padding: 4 }}>
                        <Ionicons name="trash-outline" size={14} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                    {topic.chapters.map((ch) => (
                      <TouchableOpacity
                        key={ch.id}
                        style={styles.chapterRow}
                        onPress={() => handleToggle(topic.id, ch.id)}
                        onLongPress={() => handleDeleteChapter(topic.id, ch.id)}
                      >
                        <Ionicons
                          name={ch.completed ? "checkbox" : "square-outline"}
                          size={18}
                          color={ch.completed ? colors.success : colors.textTertiary}
                        />
                        <Text style={[styles.chapterName, ch.completed && styles.chapterDone]}>
                          {ch.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {/* Add chapter button */}
                    {addChapterForTopic === topic.id ? (
                      <View style={styles.addRow}>
                        <TextInput
                          style={styles.addInput}
                          placeholder="章节名称"
                          value={newChapterName}
                          onChangeText={setNewChapterName}
                          autoFocus
                          returnKeyType="done"
                          onSubmitEditing={() => handleAddChapter(topic.id)}
                        />
                        <TouchableOpacity onPress={() => handleAddChapter(topic.id)}>
                          <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>确定</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setAddChapterForTopic(null); setNewChapterName(""); }}>
                          <Text style={{ color: colors.textTertiary, fontSize: 13 }}>取消</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addChapterBtn}
                        onPress={() => setAddChapterForTopic(topic.id)}
                      >
                        <Ionicons name="add" size={14} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontSize: 12 }}>添加章节</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}

            {/* Add topic */}
            {showAddTopic ? (
              <View style={styles.addTopicRow}>
                <TextInput
                  style={styles.addInput}
                  placeholder="专题名称（如：马原、高数）"
                  value={newTopicName}
                  onChangeText={setNewTopicName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleAddTopic}
                />
                <TouchableOpacity style={styles.confirmBtn} onPress={handleAddTopic}>
                  <Text style={styles.confirmBtnText}>添加</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowAddTopic(false); setNewTopicName(""); }}>
                  <Text style={{ color: colors.textTertiary, fontSize: 13 }}>取消</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addTopicBtn} onPress={() => setShowAddTopic(true)}>
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: "600" }}>添加复习专题</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modal: {
    backgroundColor: colors.card, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl,
    maxHeight: "85%", paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  modalTitle: { ...typography.h3, color: colors.text },
  tabRow: {
    flexDirection: "row", paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  tab: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: borderRadius.md, marginRight: spacing.sm,
    backgroundColor: colors.bg,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { ...typography.small, color: colors.textSecondary },
  tabTextActive: { color: colors.textInverse, fontWeight: "600" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  progressBarBg: { flex: 1, height: 8, backgroundColor: colors.barBg, borderRadius: 4, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 4 },
  progressText: { ...typography.small, color: colors.primary, fontWeight: "600", minWidth: 80, textAlign: "right" },
  topicCard: {
    backgroundColor: colors.bg, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.md,
  },
  topicHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  topicName: { ...typography.body, fontWeight: "600", color: colors.text, flex: 1 },
  topicProgress: { ...typography.small, color: colors.textSecondary },
  chapterRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  chapterName: { ...typography.body, color: colors.text, fontSize: 14 },
  chapterDone: { color: colors.textTertiary, textDecorationLine: "line-through" },
  addChapterBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, marginTop: spacing.xs,
  },
  addRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, marginTop: spacing.xs,
  },
  addInput: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, fontSize: 13,
    backgroundColor: colors.card,
  },
  addTopicRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    marginTop: spacing.md,
  },
  addTopicBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    paddingVertical: spacing.md, marginTop: spacing.md,
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    borderStyle: "dashed",
  },
  confirmBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  confirmBtnText: { color: colors.textInverse, fontWeight: "600", fontSize: 13 },
  emptyText: { textAlign: "center", color: colors.textTertiary, padding: spacing.xl },
});
