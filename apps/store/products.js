// Static presentation data. Prices and stock always come from Firestore (catalog/prices, catalog/stock).
window.PRODUCTS = {
  super:        { name: 'طبق سوبر',     weight: 'الجوز 300 - 350 جم', img: 'img/super.webp',        cat: 'grill', tag: 'الأكثر طلباً', blurb: 'مناسب للشوي والتحمير، حجم عملي لكل يوم.' },
  jumbo:        { name: 'طبق جامبو',    weight: 'الجوز 350 - 400 جم', img: 'img/jumbo.webp',        cat: 'stuff', tag: 'شوي وحشو',     blurb: 'حجم كبير يكفي الحشو والعزومات.' },
  special:      { name: 'طبق سبشيال',   weight: 'الجوز 400 - 450 جم', img: 'img/special.webp',      cat: 'stuff', tag: 'للعزومات',     blurb: 'لحم أكتر ووزن مضبوط للحشو الفاخر.' },
  superspecial: { name: 'سوبر سبشيال',  weight: 'الجوز 450 - 500 جم', img: 'img/superspecial.webp', cat: 'stuff', tag: 'الأكبر حجماً', blurb: 'أكبر حجم متاح للمناسبات الخاصة.' },
  eggs:         { name: 'طبق بيض سمان', weight: 'طبق 18 بيضة',        img: 'img/eggs.webp',         cat: 'eggs',  tag: 'طازج',         blurb: 'بيض سمان طازج بعبوة نظيفة.' }
};
