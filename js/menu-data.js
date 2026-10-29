// Menu transcribed from the "Menu" story highlight on instagram.com/nomad.manti (Oct 2026).
// Edit prices/items here — the menu section renders from this file.

export const MENU = [
  {
    id: 'dumplings',
    label: 'Dumplings & Pastry',
    items: [
      {
        name: 'Steamed Manti', native: 'Манты', price: 22.99, portion: '6 pcs · 510 g',
        desc: 'Juicy steamed dumplings of thinly rolled dough, filled with finely chopped lamb and onion.',
        tags: ['signature'],
      },
      {
        name: 'Chuchvara', native: 'Чучпара', price: 19.99, portion: '450 g',
        desc: 'Small handmade dumplings filled with chopped beef and onion, served in a warm, flavourful broth.',
      },
      {
        name: 'Samsa', native: 'Самса', price: 7, portion: '1 pc',
        desc: 'Flaky baked pastry with your choice of filling — chopped lamb & onion, or chicken & cheese.',
      },
    ],
  },
  {
    id: 'noodles',
    label: 'Noodles',
    items: [
      {
        name: 'Boso Lagman', native: 'Босо лагман', price: 22.99, portion: '670 g',
        desc: 'Homemade noodles wok-tossed with tender beef, bell peppers, garlic, celery, green beans and onion.',
        tags: ['signature'],
      },
      {
        name: 'Gyuro Lagman', native: 'Гуйру лагман', price: 22.99, portion: '670 g',
        desc: 'Homemade noodles with the same fresh vegetables and spices as boso, crowned with a rich beef gravy.',
      },
      {
        name: 'Dapanji', native: 'Дапанжи', price: 22.99, portion: '700 g',
        desc: 'Tender chicken braised with potatoes, bell peppers and chili, served over homemade noodles.',
      },
    ],
  },
  {
    id: 'kazan',
    label: 'Rice & Kazan',
    items: [
      {
        name: 'Pilaf', native: 'Палоо', price: 22.99, portion: '600 g',
        desc: 'Long-grain rice slow-cooked in the kazan with beef, carrots, onion, garlic and traditional spices, served with a boiled egg.',
        tags: ['signature'],
      },
      {
        name: 'Kuurdak', native: 'Куурдак', price: 22.99, portion: '600 g',
        desc: 'The herder\'s feast: tender beef sautéed with potatoes, onions and traditional spices.',
      },
      {
        name: 'Kazan Kebab', native: 'Казан кебаб', price: 24.99, portion: '850 g',
        desc: 'Tender lamb with golden potatoes, served with fresh tomatoes, cucumbers and onions.',
      },
    ],
  },
  {
    id: 'grill',
    label: 'From the Grill',
    items: [
      {
        name: 'Lamb Shish Kebab', native: 'Шашлык', price: 22.99, portion: '420 g',
        desc: 'Marinated pieces of tender lamb grilled over charcoal until juicy, with a subtle smoky aroma.',
        tags: ['weekend'],
      },
      {
        name: 'Chicken Leg Shish Kebab', native: 'Тоок шашлык', price: 22.99, portion: '420 g',
        desc: 'Juicy marinated chicken leg and thigh, grilled over an open flame with aromatic spices.',
      },
      {
        name: 'Grilled Chicken Tabaka', native: 'Табака', price: 22.99, portion: '400 g',
        desc: 'Garlic-marinated chicken pressed and grilled golden, served with crispy French fries.',
      },
      {
        name: 'Grilled Salmon Steak', native: null, price: 22.99, portion: '420 g',
        desc: 'Salmon fillet grilled to a juicy finish, with your choice of mashed potatoes or rice.',
      },
    ],
  },
  {
    id: 'soups',
    label: 'Soups & Salads',
    items: [
      {
        name: 'Tom Yum', native: null, price: 19.99, portion: '400 g',
        desc: 'Aromatic soup with shrimp and mushrooms in creamy coconut broth — lemongrass, galangal, lime leaf.',
      },
      {
        name: 'Fresh Garden Salad', native: 'Ачичук', price: 5, portion: '120 g',
        desc: 'Cucumbers, tomatoes, onions and herbs with a light house dressing.',
      },
    ],
  },
];

export const TAG_LABELS = {
  signature: 'Signature',
  weekend: 'Fri & Sat only',
};
