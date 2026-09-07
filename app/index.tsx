import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  LocalStore,
  MemoryServer,
  MockPlanner,
  plan,
  sync,
  DeviceId,
  TaskId,
  makeCounter,
  type Schedule,
  type Task,
} from "@/src/core";

const DEVICE = DeviceId("this-device");

export default function Index() {
  // A monotonic clock so demo edits get increasing timestamps; the engine is deterministic.
  const clockRef = useRef<() => number>(
    (() => {
      let t = Date.now();
      return () => (t += 1000);
    })(),
  );
  const storeRef = useRef<LocalStore>(new LocalStore(DEVICE, clockRef.current));
  const serverRef = useRef<MemoryServer>(new MemoryServer());
  const idRef = useRef(makeCounter("t"));

  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  const [minutes, setMinutes] = useState("45");
  const [title, setTitle] = useState("");
  const [taskMinutes, setTaskMinutes] = useState("10");
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [online, setOnline] = useState(true);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const tasks = storeRef.current.list();
  const pending = storeRef.current.pending().length;

  // Seed a few tasks the first time so the demo isn't empty.
  const seeded = useRef(false);
  if (!seeded.current) {
    seeded.current = true;
    const s = storeRef.current;
    s.create(TaskId(idRef.current()), "Task A", 15);
    s.create(TaskId(idRef.current()), "Task B", 10);
    s.create(TaskId(idRef.current()), "Prepare bag", 8);
    s.create(TaskId(idRef.current()), "Deep work block", 40);
  }

  async function onPlan() {
    const result = await plan(
      { availableMinutes: Number(minutes) || 0, tasks: storeRef.current.list() },
      { planner: new MockPlanner() },
    );
    setSchedule(result.schedule ?? null);
  }

  function onAddTask() {
    const t = title.trim();
    const m = Number(taskMinutes);
    if (!t || !Number.isFinite(m) || m <= 0) return;
    storeRef.current.create(TaskId(idRef.current()), t, m);
    setTitle("");
    setTaskMinutes("10");
    rerender();
  }

  function onToggle(task: Task) {
    storeRef.current.edit(task.id, { status: task.status === "todo" ? "done" : "todo" });
    rerender();
  }

  function onDelete(task: Task) {
    storeRef.current.remove(task.id);
    rerender();
  }

  function onSync() {
    if (!online) {
      setSyncMsg("You're offline — changes are queued and will sync on reconnect.");
      return;
    }
    const r = sync(storeRef.current, serverRef.current);
    setSyncMsg(
      `Synced ${r.pushed} up / ${r.pulled} down · ${r.conflicts.length} conflict(s) resolved deterministically.`,
    );
    rerender();
  }

  function onWipe() {
    storeRef.current.wipe();
    setSchedule(null);
    setSyncMsg("All local data deleted.");
    rerender();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <StatusBar style="light" />

      <Text style={styles.lead}>
        The AI proposes an ordering; deterministic code fits it to your window and reserves a travel buffer. Works fully
        offline — edits queue and sync with deterministic conflict resolution.
      </Text>

      {/* Planner */}
      <View style={styles.card}>
        <Text style={styles.h2}>I have … minutes before I leave</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { width: 90 }]}
            value={minutes}
            onChangeText={setMinutes}
            keyboardType="number-pad"
            placeholder="45"
            placeholderTextColor="#6b7280"
          />
          <Text style={styles.muted}>minutes</Text>
          <Pressable style={styles.primary} onPress={onPlan}>
            <Text style={styles.primaryText}>Plan</Text>
          </Pressable>
        </View>

        {schedule && (
          <View style={styles.plan}>
            {schedule.items.map((i) => (
              <View style={styles.planRow} key={i.id}>
                <Text style={styles.planTitle}>{i.title}</Text>
                <Text style={styles.planMin}>{i.minutes} min</Text>
              </View>
            ))}
            <View style={[styles.planRow, styles.bufferRow]}>
              <Text style={styles.bufferTitle}>Travel buffer</Text>
              <Text style={styles.bufferMin}>{schedule.travelBuffer} min</Text>
            </View>
            {schedule.deferred.length > 0 && (
              <Text style={styles.deferred}>
                Deferred: {schedule.deferred.map((d) => d.title).join(", ")}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Tasks */}
      <View style={styles.card}>
        <Text style={styles.h2}>Tasks ({tasks.length})</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={title}
            onChangeText={setTitle}
            placeholder="New task…"
            placeholderTextColor="#6b7280"
          />
          <TextInput
            style={[styles.input, { width: 64 }]}
            value={taskMinutes}
            onChangeText={setTaskMinutes}
            keyboardType="number-pad"
          />
          <Pressable style={styles.primary} onPress={onAddTask}>
            <Text style={styles.primaryText}>Add</Text>
          </Pressable>
        </View>

        {tasks.map((t) => (
          <View style={styles.taskRow} key={String(t.id)}>
            <Pressable onPress={() => onToggle(t)} style={styles.check}>
              <Text style={styles.checkMark}>{t.status === "done" ? "✓" : ""}</Text>
            </Pressable>
            <Text style={[styles.taskTitle, t.status === "done" && styles.done]}>
              {t.title} · {t.minutes}m
            </Text>
            <Text style={styles.version}>v{t.version}</Text>
            <Pressable onPress={() => onDelete(t)}>
              <Text style={styles.del}>✕</Text>
            </Pressable>
          </View>
        ))}
      </View>

      {/* Sync */}
      <View style={styles.card}>
        <Text style={styles.h2}>Sync</Text>
        <View style={styles.row}>
          <Pressable style={[styles.toggle, online ? styles.on : styles.off]} onPress={() => setOnline((v) => !v)}>
            <Text style={styles.toggleText}>{online ? "Online" : "Offline"}</Text>
          </Pressable>
          <Text style={styles.muted}>{pending} queued</Text>
          <Pressable style={styles.primary} onPress={onSync}>
            <Text style={styles.primaryText}>Sync now</Text>
          </Pressable>
        </View>
        {syncMsg && <Text style={styles.syncMsg}>{syncMsg}</Text>}
        <Pressable onPress={onWipe} style={styles.wipe}>
          <Text style={styles.wipeText}>Delete my data</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0b0f19" },
  content: { padding: 16, maxWidth: 640, width: "100%", alignSelf: "center", gap: 14 },
  lead: { color: "#9ca3af", fontSize: 13.5, lineHeight: 20 },
  card: { backgroundColor: "#111726", borderColor: "#1f2937", borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
  h2: { color: "#e5e7eb", fontSize: 14, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  input: { backgroundColor: "#0e1420", borderColor: "#1f2937", borderWidth: 1, borderRadius: 8, color: "#e5e7eb", paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  muted: { color: "#9ca3af", fontSize: 13 },
  primary: { backgroundColor: "#6366f1", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  plan: { marginTop: 6, gap: 4 },
  planRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomColor: "#1f2937", borderBottomWidth: 1 },
  planTitle: { color: "#e5e7eb", fontSize: 14 },
  planMin: { color: "#e5e7eb", fontSize: 14, fontVariant: ["tabular-nums"] },
  bufferRow: { borderBottomWidth: 0 },
  bufferTitle: { color: "#f59e0b", fontSize: 14, fontWeight: "600" },
  bufferMin: { color: "#f59e0b", fontSize: 14, fontVariant: ["tabular-nums"] },
  deferred: { color: "#6b7280", fontSize: 12.5, marginTop: 4 },
  taskRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6, borderBottomColor: "#1f2937", borderBottomWidth: 1 },
  check: { width: 22, height: 22, borderRadius: 6, borderColor: "#6366f1", borderWidth: 1, alignItems: "center", justifyContent: "center" },
  checkMark: { color: "#22c55e", fontSize: 14, fontWeight: "700" },
  taskTitle: { color: "#e5e7eb", fontSize: 14, flex: 1 },
  done: { textDecorationLine: "line-through", color: "#6b7280" },
  version: { color: "#6b7280", fontSize: 11, fontVariant: ["tabular-nums"] },
  del: { color: "#ef4444", fontSize: 15, paddingHorizontal: 4 },
  toggle: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  on: { backgroundColor: "rgba(34,197,94,0.18)" },
  off: { backgroundColor: "rgba(239,68,68,0.18)" },
  toggleText: { color: "#e5e7eb", fontWeight: "600", fontSize: 13 },
  syncMsg: { color: "#22d3ee", fontSize: 12.5 },
  wipe: { marginTop: 4, alignSelf: "flex-start" },
  wipeText: { color: "#ef4444", fontSize: 13, textDecorationLine: "underline" },
});
