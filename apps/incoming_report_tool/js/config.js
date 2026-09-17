/* ============================================================
   CONFIG — unico punto di verità per il tool.
   Per adattarlo ad altri report basta modificare questo file.
   ============================================================ */
const CONFIG = {
  appName: 'Incoming Inspection Report',

  /* Campi anagrafica. `tag` è il nome del placeholder nel template Word. */
  fields: [
    { id:'project',   label:'Progetto:',             tag:'PROJECT',       def:'IOS PNRR' },
    { id:'supplier',  label:'Fornitore (Supplier):', tag:'SUPPLIER',      def:'' },
    { id:'location',  label:'Location:',             tag:'LOCATION',      def:'Nerviano' },
    { id:'equipment', label:'Equipaggiamento:',      tag:'EQUIPMENT',     def:'' },
    { id:'pn',        label:'Part Number:',          tag:'PART_NUMBER',   def:'' },
    { id:'sn',        label:'Serial Number:',        tag:'SERIAL_NUMBER', def:'' },
    { id:'dwg',       label:'DWG Issue:',            tag:'DWG_ISSUE',     def:'' },
    { id:'inspector', label:'Ispettore:',            tag:'INSPECTOR',     def:'' },
    { id:'desc',      label:'Description:',          tag:'PART_DESC',     def:'' }
  ],

  /* Modelli hardware — radio. */
  hwModels: [
    { id:'BB',  label:'BB',      tag:'HW_BB'  },
    { id:'EM',  label:'EM',      tag:'HW_EM'  },
    { id:'EQM', label:'EQM',     tag:'HW_EQM' },
    { id:'PFM', label:'PFM/FM',  tag:'HW_PFM' }
  ],

  /* Checklist. L'id determina i tag generati:
     CH_<ID>_NA / CH_<ID>_YES / CH_<ID>_NO */
  checklist: [
    { id:'trace_1', text:'Each part is uniquely identified (Serial number clearly visible)' },
    { id:'vis_1',   text:'All parts are visibly intact' },
    { id:'vis_2',   text:'All holes or IF geometries have been manufactured' },
    { id:'vis_3',   text:'All helicoils have been mounted (if any)' },
    { id:'vis_4',   text:'Screw assembly test performed on every threaded hole' },
    { id:'vis_5',   text:'The item has been delivered with the agreed connector' },
    { id:'vis_6',   text:'The item has been delivered with the agreed cable length' },
    { id:'vis_7',   text:'Image of the object taken and archived' },
    { id:'elec_1',  text:'Resistance test measurements in line with the component datasheet' },
    { id:'elec_2',  text:'Isolation test performed' },
    { id:'func_1',  text:'The item can be actuated with the nominal supply parameter' },
    { id:'func_2',  text:'The item can be read with the agreed protocol' },
    { id:'func_3',  text:'The item can be written with the agreed protocol' },
    { id:'doc_1',   text:'Certificate of Conformity attached and archived' },
    { id:'doc_2',   text:'Test report attached and archived' }
  ],
  checklistOptions: ['N/A', 'Yes', 'No'],

  /* Decisione finale. */
  decisions: [
    { id:'unacceptable',   label:'Hardware UNACCEPTABLE',                 tag:'DEC_UNACCEPTABLE' },
    { id:'acceptable_no',  label:'Hardware ACCEPTABLE WITHOUT ACTIONS',   tag:'DEC_ACCEPTABLE_NO' },
    { id:'acceptable_with',label:'Hardware ACCEPTABLE WITH ACTIONS',      tag:'DEC_ACCEPTABLE_WITH' }
  ],
  defaultDecision: 'acceptable_no',

  /* Flag checkbox (compatibile Word). */
  checkFlag: { on:'[X]', off:'[ ]' },

  /* Commenti + data (tag riservati). */
  commentsTag: 'COMMENTS',
  dateTag: 'DATE',

  /* Template di default (usato solo se servito via HTTP). */
  defaultTemplate: 'assets/Incoming_Inspection_Report.docx'
};