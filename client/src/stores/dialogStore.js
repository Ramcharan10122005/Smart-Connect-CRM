import { create } from 'zustand';

export const useDialogStore = create((set) => ({
  // Log Activity Dialog
  logActivityOpen: false,
  logActivityDefaults: null,
  openLogActivity: (defaults = {}) =>
    set({
      logActivityOpen: true,
      logActivityDefaults: defaults,
    }),
  closeLogActivity: () =>
    set({
      logActivityOpen: false,
      logActivityDefaults: null,
    }),

  // Follow-up Create / Edit Dialog
  followUpModalOpen: false,
  followUpModalData: null, // null for create, or followUp object for edit
  openCreateFollowUp: (defaults = {}) =>
    set({
      followUpModalOpen: true,
      followUpModalData: { isEdit: false, ...defaults },
    }),
  openEditFollowUp: (followUp) =>
    set({
      followUpModalOpen: true,
      followUpModalData: { isEdit: true, ...followUp },
    }),
  closeFollowUpModal: () =>
    set({
      followUpModalOpen: false,
      followUpModalData: null,
    }),
}));
