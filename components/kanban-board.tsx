"use client";

import { useMemo, useState } from "react";
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, Clock3 } from "lucide-react";
import { canMoveTask, canViewTask } from "@/lib/permissions";
import { useCurrentUser, useAppStore } from "@/lib/store";
import { cn, formatDateTime, isOverdue } from "@/lib/utils";

function TaskCard({
  taskId,
  dragging = false,
}: {
  taskId: string;
  dragging?: boolean;
}) {
  const task = useAppStore((state) => state.tasks.find((entry) => entry.id === taskId));
  const assignee = useAppStore((state) => state.users.find((entry) => entry.id === task?.assigneeId));
  const users = useAppStore((state) => state.users);
  const currentUser = useCurrentUser();
  const selectTask = useAppStore((state) => state.selectTask);
  const canDrag = currentUser && task ? canMoveTask(currentUser, task, users) : false;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: taskId,
    data: {
      type: "task",
      taskId,
      columnId: task?.columnId,
    },
    disabled: !canDrag,
  });

  if (!task) {
    return null;
  }

  return (
    <article
      ref={setNodeRef}
      className={cn(
        "kanban-card",
        isOverdue(task.dueAt) && task.columnId !== "done" && "kanban-card-overdue",
        (isDragging || dragging) && "kanban-card-dragging",
      )}
      style={{
        transform: CSS.Translate.toString(transform),
      }}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isDragging) {
          selectTask(task.id);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="kanban-card-top">
        <span className={`pill priority-${task.priority}`}>{task.priority}</span>
        {task.requiresChecklist ? <span className="pill pill-muted">Checklist</span> : null}
      </div>
      <strong>{task.title}</strong>
      <p>{task.description}</p>
      <div className="kanban-card-footer">
        <span>
          {assignee?.avatar} - {assignee?.name}
        </span>
        <span className="kanban-time">
          {isOverdue(task.dueAt) && task.columnId !== "done" ? <AlertTriangle size={14} /> : <Clock3 size={14} />}
          {formatDateTime(task.dueAt)}
        </span>
      </div>
    </article>
  );
}

function ColumnDropZone({
  columnId,
  children,
}: {
  columnId: string;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: columnId,
    data: {
      type: "column",
      columnId,
    },
  });

  return (
    <div ref={setNodeRef} className={cn("kanban-column-body", isOver && "kanban-column-body-active")}>
      {children}
    </div>
  );
}

export function KanbanBoard() {
  const currentUser = useCurrentUser();
  const columns = useAppStore((state) => state.columns);
  const tasks = useAppStore((state) => state.tasks);
  const users = useAppStore((state) => state.users);
  const moveTask = useAppStore((state) => state.moveTask);
  const selectTask = useAppStore((state) => state.selectTask);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 6 } }),
  );

  const activeTask = useMemo(() => tasks.find((task) => task.id === activeTaskId) ?? null, [activeTaskId, tasks]);

  if (!currentUser) {
    return null;
  }
  const viewer = currentUser;

  function onDragStart(event: DragStartEvent) {
    setActiveTaskId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveTaskId(null);
    setFeedback("");
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find((task) => task.id === active.id);
    if (!activeTask || !canMoveTask(viewer, activeTask, users)) return;

    const rawColumnId = over.data.current?.columnId ?? over.data.current?.task?.columnId ?? String(over.id);
    const overTask = tasks.find((task) => task.id === over.id);
    const nextColumnId = overTask?.columnId ?? rawColumnId;

    if (!nextColumnId || nextColumnId === activeTask.columnId) {
      return;
    }

    const result = moveTask(activeTask.id, nextColumnId, viewer.id);
    if (!result.ok) {
      setFeedback(result.message ?? "No se pudo mover la tarea.");
      selectTask(activeTask.id);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveTaskId(null);
        setFeedback("");
      }}
    >
      {feedback ? <div className="status status-warning">{feedback}</div> : null}
      <div className="kanban-grid">
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.columnId === column.id && canViewTask(viewer, task, users));
          return (
            <section key={column.id} className="panel kanban-column">
              <div className="kanban-column-header">
                <div>
                  <span className="column-dot" style={{ background: column.color }} />
                  <strong>{column.title}</strong>
                </div>
                <span className="pill pill-muted">
                  {columnTasks.length}
                  {column.limit ? ` / ${column.limit}` : ""}
                </span>
              </div>
              <ColumnDropZone columnId={column.id}>
                {columnTasks.map((task) => (
                  <TaskCard key={task.id} taskId={task.id} />
                ))}
              </ColumnDropZone>
            </section>
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>{activeTask ? <TaskCard taskId={activeTask.id} dragging /> : null}</DragOverlay>
    </DndContext>
  );
}
