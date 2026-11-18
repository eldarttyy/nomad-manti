// Links used across the site. Paste the DoorDash / Uber Eats store URLs here once the
// restaurant is live on those apps — their buttons appear automatically when set.

export const LINKS = {
  phone: 'tel:+14255186966',
  googleMaps: 'https://www.google.com/maps/place/?q=place_id:ChIJS_91cwAVkFQRP54GlcYibS0',
  googleReview: 'https://search.google.com/local/writereview?placeid=ChIJS_91cwAVkFQRP54GlcYibS0',
  doordash: null, // e.g. 'https://www.doordash.com/store/nomad-manti-seattle-12345678/'
  ubereats: null, // e.g. 'https://www.ubereats.com/store/nomad-manti/AbCdEf...'

  // CLOVER ONLINE ORDERING: once Restaurant Growth is active on the Nomad Manti account, paste
  // the Clover ordering page here. Every "Order online" button on the site then goes there
  // instead of order.html (orders land in the POS and print in the kitchen).
  onlineOrdering: null, // e.g. 'https://www.clover.com/online-ordering/nomad-manti-seattle'
};

// Catering page (catering.html). Anything left null is simply not shown — fill these in once
// the restaurant has decided them; nothing on the page invents a price or a rule.
export const CATERING = {
  sms: '+14255186966',  // inquiry form opens a text to this number
  email: null,          // e.g. 'catering@nomadmanti.com' — adds a "Send by email" button
  minNoticeDays: null,  // e.g. 3 — earliest selectable event date, and shown under "How it works"
  minGuests: null,      // e.g. 10
  terms: null,          // one line of extra conditions, e.g. 'Delivery within 10 miles, $25.'
  // Shown under each dish on the catering page, e.g. { price: 'from $120', serves: 'serves 10–12' }
  trays: {
    plov: null,
    manti: null,
    shashlik: null,
    lagman: null,
    samsa: null,
  },
};

// Online ordering (order.html).
export const ORDER = {
  // PAYMENT: the address of the Stripe backend (api/checkout.js, deployed on Vercel — steps in
  // README.md). While this is null the page takes pay-at-pickup orders by text message instead.
  endpoint: null, // e.g. 'https://nomad-manti.vercel.app/api/checkout'

  // Used only while `endpoint` is null: the guest's phone opens a pre-written text to this
  // number. Set to null to show "call to order" instead.
  sms: '+14255186966',

  taxRate: 0.1035,        // Seattle sales tax — confirm the current rate before launch
  tips: [0, 10, 15, 20],  // tip choices in %, shown once payments are on; [] to hide

  timezone: 'America/Los_Angeles',
  open: '11:00',          // kitchen opens
  lastPickup: '22:30',    // latest pickup slot
  prepMinutes: 25,        // earliest pickup = now + this
  slotMinutes: 15,
  weekendDays: [5, 6],    // days 'weekend' items are cooked (0 = Sunday … 5 = Fri, 6 = Sat)
  maxQty: 20,             // per line
};
