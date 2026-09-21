// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
// AWAITING THE COPY PASS — the English behind `guidance` and every
// `errors.narrowing` sentence is provisional (journey-spec.json
// pages[origin].provisionalCopy, decisions.json d-054).
// `title`, `country.*` are the live-animals strings for the identical English
// (live-animals features/origin/copy/copy.cy.js). `errors.countryRequired`
// diverges from animals because the English does: the subject is the
// consignment, not the animal (journey-spec.json c-027), so the Welsh is
// machine-draft. `guidance` and `errors.narrowing` have no service counterpart
// and are machine-draft too.
export const copy = {
  title: 'Tarddiad y mewnforyn',
  country: {
    label: 'Gwlad tarddiad',
    hint: 'Dechreuwch deipio i chwilio am wlad.',
    placeholder: 'Dewiswch wlad',
    noResults: 'Dim gwledydd wedi’u darganfod'
  },
  guidance: {
    'ware-potatoes':
      'Hysbyswch am datws bwyd a dyfwyd, neu y tybir iddynt gael eu tyfu, yng Ngwlad Pwyl, Portiwgal, Rwmania neu Sbaen. Nid yw Sbaen yn cynnwys Ynysoedd y Baleares.'
  },
  errors: {
    countryRequired: 'Dewiswch y wlad y mae’r llwyth yn tarddu ohoni',
    narrowing: {
      'ware-potatoes':
        'Dewiswch Wlad Pwyl, Portiwgal, Rwmania neu Sbaen – nid oes angen hysbysu am datws bwyd o wledydd eraill',
      'conifer-wood-without-bark':
        'Dewiswch yr Eidal, Ffrainc, Portiwgal neu Sbaen – nid oes angen hysbysu am bren conwydd heb risgl o wledydd eraill',
      'eu-member-states':
        'Dewiswch aelod-wladwriaeth o’r UE – nid oes angen hysbysu am blanhigion a phren o wledydd eraill'
    }
  }
}
