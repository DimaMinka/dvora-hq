export const USERS_STEPS = {
  SQUAD: 'squad',
  SQUAD_TEXT: 'squad_text',
  USERNAME: 'username',
  CONFIRM: 'confirm',
  USER: 'user',
  SELECT_SQUAD: 'select_squad',
};

export const ROTATION_STEPS = {
  DURATION: 'duration',
  ALERT: 'alert',
  STANDBY: 'standby',
  REST: 'rest',
  CONFIRM: 'confirm',
  OVERWRITE: 'overwrite',
};

export const MISSION_STEPS = {
  SELECT_ROTATION: 'select_rotation',
  SELECT_DAY: 'select_day',
  TIME_INPUT: 'time_input',
};

export const MISSION_COMPLETE_STEPS = {
  SELECT_ROTATION: 'complete_select_rotation',
  SELECT_DAY: 'complete_select_day',
  MEDIA_INPUT: 'complete_media_input',
  PROCESSING: 'complete_processing',
  CONCLUSION_INPUT: 'complete_conclusion_input',
};

export const MISSION_RESET_STEPS = {
  SELECT_ROTATION: 'reset_select_rotation',
  SELECT_DAY: 'reset_select_day',
  CONFIRM: 'reset_confirm',
};

export const REPORT_STEPS = {
  COLLECT_INPUTS: 'report_collect_inputs',
  PROCESSING: 'report_processing',
};

export const REPORT_RESET_STEPS = {
  SELECT_SQUAD: 'report_reset_select_squad',
  CONFIRM: 'report_reset_confirm',
};
