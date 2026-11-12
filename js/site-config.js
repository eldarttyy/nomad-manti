// Links used across the site. Paste the DoorDash / Uber Eats store URLs here once the
// restaurant is live on those apps — their buttons appear automatically when set.

export const LINKS = {
  phone: 'tel:+14255186966',
  googleMaps: 'https://www.google.com/maps/place/?q=place_id:ChIJS_91cwAVkFQRP54GlcYibS0',
  googleReview: 'https://search.google.com/local/writereview?placeid=ChIJS_91cwAVkFQRP54GlcYibS0',
  doordash: null, // e.g. 'https://www.doordash.com/store/nomad-manti-seattle-12345678/'
  ubereats: null, // e.g. 'https://www.ubereats.com/store/nomad-manti/AbCdEf...'
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
