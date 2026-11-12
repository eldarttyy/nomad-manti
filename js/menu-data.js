// Menu transcribed from the "Menu" story highlight on instagram.com/nomad.manti (Oct 2026).
// Edit prices/items here — the menu section and the order page (order.html) render from this file.
//
// Per item:  id       stable code sent with online orders — don't rename once payments are live
//            options  choices the guest must make when ordering (see OPTION_GROUPS below)
//            photo    optional file in assets/photos/, shown on the order page
//            tags     'weekend' items can only be ordered on the days in ORDER.weekendDays

export const MENU = [
  {
    id: 'dumplings',
    label: 'Dumplings & Pastry',
    items: [
      {
        id: 'manti', name: 'Steamed Manti', native: 'Манты', price: 22.99, portion: '6 pcs · 510 g',
        desc: 'Juicy steamed dumplings of thinly rolled dough, filled with finely chopped lamb and onion.',
        tags: ['signature'],
        options: ['drink'],
        photo: 'manti.jpg',
      },
      {
        id: 'chuchvara', name: 'Chuchvara', native: 'Чучпара', price: 19.99, portion: '450 g',
        desc: 'Small handmade dumplings filled with chopped beef and onion, served in a warm, flavourful broth.',
        options: ['drink'],
      },
      {
        id: 'samsa', name: 'Samsa', native: 'Самса', price: 7, portion: '1 pc',
        desc: 'Flaky baked pastry with your choice of filling — chopped lamb & onion, or chicken & cheese.',
        options: ['filling'],
      },
    ],
  },
  {
    id: 'noodles',
    label: 'Noodles',
    items: [
      {
        id: 'boso-lagman', name: 'Boso Lagman', native: 'Босо лагман', price: 22.99, portion: '670 g',
        desc: 'Homemade noodles wok-tossed with tender beef, bell peppers, garlic, celery, green beans and onion.',
        tags: ['signature'],
        options: ['drink'],
        photo: 'boso-lagman.jpg',
      },
      {
        id: 'gyuro-lagman', name: 'Gyuro Lagman', native: 'Гуйру лагман', price: 22.99, portion: '670 g',
        desc: 'Homemade noodles with the same fresh vegetables and spices as boso, crowned with a rich beef gravy.',
        options: ['drink'],
      },
      {
        id: 'dapanji', name: 'Dapanji', native: 'Дапанжи', price: 22.99, portion: '700 g',
        desc: 'Tender chicken braised with potatoes, bell peppers and chili, served over homemade noodles.',
        options: ['drink'],
      },
    ],
  },
  {
    id: 'kazan',
    label: 'Rice & Kazan',
    items: [
      {
        id: 'pilaf', name: 'Pilaf', native: 'Палоо', price: 22.99, portion: '600 g',
        desc: 'Long-grain rice slow-cooked in the kazan with beef, carrots, onion, garlic and traditional spices, served with a boiled egg.',
        tags: ['signature'],
        options: ['drink'],
        photo: 'plov-achichuk.jpg',
      },
      {
        id: 'kuurdak', name: 'Kuurdak', native: 'Куурдак', price: 22.99, portion: '600 g',
        desc: 'The herder\'s feast: tender beef sautéed with potatoes, onions and traditional spices.',
        options: ['drink'],
      },
      {
        id: 'kazan-kebab', name: 'Kazan Kebab', native: 'Казан кебаб', price: 24.99, portion: '850 g',
        desc: 'Tender lamb with golden potatoes, served with fresh tomatoes, cucumbers and onions.',
        options: ['drink'],
      },
    ],
  },
  {
    id: 'grill',
    label: 'From the Grill',
    items: [
      {
        id: 'lamb-shashlik', name: 'Lamb Shish Kebab', native: 'Шашлык', price: 22.99, portion: '420 g',
        desc: 'Marinated pieces of tender lamb grilled over charcoal until juicy, with a subtle smoky aroma.',
        tags: ['weekend'],
        options: ['drink'],
        photo: 'shashlik-grill.jpg',
      },
      {
        id: 'chicken-shashlik', name: 'Chicken Leg Shish Kebab', native: 'Тоок шашлык', price: 22.99, portion: '420 g',
        desc: 'Juicy marinated chicken leg and thigh, grilled over an open flame with aromatic spices.',
        options: ['drink'],
      },
      {
        id: 'tabaka', name: 'Grilled Chicken Tabaka', native: 'Табака', price: 22.99, portion: '400 g',
        desc: 'Garlic-marinated chicken pressed and grilled golden, served with crispy French fries.',
        options: ['drink'],
      },
      {
        id: 'salmon', name: 'Grilled Salmon Steak', native: null, price: 22.99, portion: '420 g',
        desc: 'Salmon fillet grilled to a juicy finish, with your choice of mashed potatoes or rice.',
        options: ['side', 'drink'],
      },
    ],
  },
  {
    id: 'soups',
    label: 'Soups & Salads',
    items: [
      {
        id: 'tom-yum', name: 'Tom Yum', native: null, price: 19.99, portion: '400 g',
        desc: 'Aromatic soup with shrimp and mushrooms in creamy coconut broth — lemongrass, galangal, lime leaf.',
        options: ['drink'],
        photo: 'tom-yum.jpg',
      },
      {
        id: 'salad', name: 'Fresh Garden Salad', native: 'Ачичук', price: 5, portion: '120 g',
        desc: 'Cucumbers, tomatoes, onions and herbs with a light house dressing.',
      },
    ],
  },
];

export const TAG_LABELS = {
  signature: 'Signature',
  weekend: 'Fri & Sat only',
};

// Choices offered on the order page. Entrées carry 'drink' because each one includes
// black tea or a canned drink. The first choice is preselected.
export const OPTION_GROUPS = {
  drink: { label: 'Included drink', choices: ['Black tea', 'Canned drink'] },
  filling: { label: 'Filling', choices: ['Lamb & onion', 'Chicken & cheese'] },
  side: { label: 'Side', choices: ['Mashed potatoes', 'Rice'] },
};
