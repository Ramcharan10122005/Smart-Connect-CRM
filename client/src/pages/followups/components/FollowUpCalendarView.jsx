import { useMemo, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import classicThemePlugin from '@fullcalendar/react/themes/classic';
import dayGridPlugin from '@fullcalendar/react/daygrid';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import interactionPlugin from '@fullcalendar/react/interaction';

import '@fullcalendar/react/skeleton.css';
import '@fullcalendar/react/themes/classic/theme.css';
import '@fullcalendar/react/themes/classic/palette.css';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useDialogStore } from '@/stores/dialogStore';

const PRIORITY_COLORS = {
  URGENT: { bg: '#e11d48', border: '#be123c' },
  HIGH: { bg: '#d97706', border: '#b45309' },
  MEDIUM: { bg: '#4f46e5', border: '#4338ca' },
  LOW: { bg: '#059669', border: '#047857' },
};

export function FollowUpCalendarView({ followUps = [] }) {
  const calendarRef = useRef(null);
  const queryClient = useQueryClient();
  const { openCreateFollowUp, openEditFollowUp } = useDialogStore();

  // Convert followUps into FullCalendar events
  const events = useMemo(() => {
    return followUps.map((fu) => {
      const colors = PRIORITY_COLORS[fu.priority] || PRIORITY_COLORS.MEDIUM;
      const isDone = fu.status === 'DONE';

      return {
        id: fu.id,
        title: fu.title,
        start: fu.dueAt,
        allDay: false,
        backgroundColor: isDone ? '#64748b' : colors.bg,
        borderColor: isDone ? '#475569' : colors.border,
        textColor: '#ffffff',
        extendedProps: {
          followUp: fu,
        },
      };
    });
  }, [followUps]);

  // Drag to reschedule mutation
  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, newDueAt }) => {
      const res = await api.patch(`/follow-ups/${id}`, {
        dueAt: newDueAt,
      });
      return res.data?.data;
    },
    onSuccess: (data) => {
      toast.success(`Rescheduled: "${data?.title || 'Task'}"`);
      queryClient.invalidateQueries({ queryKey: queryKeys.followUps.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.upcoming() });
    },
    onError: (err, variables, context) => {
      toast.error('Failed to reschedule task');
      if (context?.revert) {
        context.revert();
      }
    },
  });

  const handleEventDrop = (info) => {
    const newDueAt = info.event.start.toISOString();
    rescheduleMutation.mutate(
      { id: info.event.id, newDueAt },
      {
        onError: () => {
          info.revert();
        },
      }
    );
  };

  const handleEventClick = (info) => {
    const original = info.event.extendedProps.followUp;
    if (original) {
      openEditFollowUp(original);
    }
  };

  const handleDateSelect = (info) => {
    const selectedDate = info.startStr || info.dateStr;
    openCreateFollowUp({ dueAt: selectedDate });
  };

  return (
    <div className="rounded-card border bg-card p-4 shadow-sm">
      <div className="fc-theme-smartconnect">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, classicThemePlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={3}
          weekends={true}
          events={events}
          eventDrop={handleEventDrop}
          eventClick={handleEventClick}
          select={handleDateSelect}
          height="auto"
          aspectRatio={1.65}
          eventTimeFormat={{
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short',
          }}
        />
      </div>
    </div>
  );
}

