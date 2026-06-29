// Phase 4: Survey category filter system.
//
// Preset categories surface as suggestions in the survey editor (via a
// <datalist>) but the underlying field is free text, so teams can introduce
// their own labels without a code change. The dashboard filter is built from
// the categories actually in use, not from this list, so new labels appear
// automatically.

export const SURVEY_CATEGORIES: string[] = [
  'Community',
  'Education',
  'Health & Wellness',
  'Employment',
  'Events',
  'Research',
  'Feedback',
  'Other',
];

/** Sentinel used by filter controls to represent surveys with no category. */
export const UNCATEGORIZED_LABEL = 'Uncategorized';
