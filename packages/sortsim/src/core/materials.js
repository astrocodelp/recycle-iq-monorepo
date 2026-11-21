// Copied from github.com/Mike17K/recycleiq-delta-sort (src/core/materials.js); see NOTICE.
/** Material classes. A class id is also the id of the bin that collects it. */
export const RESIDUE = 'RESIDUE';

export const MATERIALS = {
  PET_CLEAR: { color: '#8fd3f4', label: { en: 'PET clear',    el: 'PET διαφανές' } },
  PET_COLOR: { color: '#3aa655', label: { en: 'PET coloured', el: 'PET χρωματιστό' } },
  HDPE:      { color: '#f4b942', label: { en: 'HDPE',         el: 'HDPE' } },
  PP:        { color: '#e4572e', label: { en: 'PP',           el: 'PP' } },
  PS:        { color: '#b07cc6', label: { en: 'PS',           el: 'PS' } },
  ALU:       { color: '#c4c9cf', label: { en: 'Aluminium',    el: 'Αλουμίνιο' } },
  GLASS:     { color: '#5fd0b0', label: { en: 'Glass',        el: 'Γυαλί' } },
  CARTON:    { color: '#c89b5a', label: { en: 'Carton',       el: 'Χαρτόνι' } },
  STEEL:     { color: '#6f8fb0', label: { en: 'Steel',        el: 'Χάλυβας' } },
  [RESIDUE]: { color: '#8a7560', label: { en: 'Residue',      el: 'Υπόλειμμα' } },
};

export const SORTABLE = Object.keys(MATERIALS).filter(k => k !== RESIDUE);
export const materialColor = id => MATERIALS[id].color;
export const materialLabel = (id, lang) => MATERIALS[id].label[lang] || id;
