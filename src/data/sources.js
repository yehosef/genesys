// ── Hebrew Source Text Library ────────────────────────────────────────
// Pure data module — no DOM, no Three.js.
// Each source has display text (with spaces) and pipeline text (letters only).
// All texts use standard Hebrew letters (no vowels, no cantillation marks).

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const SOURCE_CATEGORIES = {
  torah:          { label: 'Torah Passages',      icon: '📜' },
  'tribal-jacob': { label: "Jacob's Blessings",   icon: '👥' },
  'tribal-moses': { label: "Moses' Blessings",    icon: '🏔' },
  kabbalistic:    { label: 'Kabbalistic',          icon: '✡' },
  psalms:         { label: 'Psalms',               icon: '🎵' },
};

// ---------------------------------------------------------------------------
// Helper: build a source entry from display text
// ---------------------------------------------------------------------------

function src(id, name, nameHe, category, reference, display) {
  return {
    id,
    name,
    nameHe,
    category,
    reference,
    display,
    text: display.replace(/\s/g, ''),
  };
}

// ---------------------------------------------------------------------------
// Torah Passages
// ---------------------------------------------------------------------------

const torah = [

  // Genesis 1:1
  src(
    'genesis-1-1',
    'Genesis 1:1',
    'בראשית א:א',
    'torah',
    'Genesis 1:1',
    'בראשית ברא אלהים את השמים ואת הארץ'
  ),

  // Shema / Mezuzah (Deuteronomy 6:4-9 + 11:13-21)
  src(
    'mezuzah',
    'Mezuzah (Shema)',
    'מזוזה (שמע)',
    'torah',
    'Deuteronomy 6:4-9, 11:13-21',
    'שמע ישראל יהוה אלהינו יהוה אחד ואהבת את יהוה אלהיך בכל לבבך ובכל נפשך ובכל מאדך והיו הדברים האלה אשר אנכי מצוך היום על לבבך ושננתם לבניך ודברת בם בשבתך בביתך ובלכתך בדרך ובשכבך ובקומך וקשרתם לאות על ידך והיו לטטפת בין עיניך וכתבתם על מזזות ביתך ובשעריך והיה אם שמע תשמעו אל מצותי אשר אנכי מצוה אתכם היום לאהבה את יהוה אלהיכם ולעבדו בכל לבבכם ובכל נפשכם ונתתי מטר ארצכם בעתו יורה ומלקוש ואספת דגנך ותירשך ויצהרך ונתתי עשב בשדך לבהמתך ואכלת ושבעת השמרו לכם פן יפתה לבבכם וסרתם ועבדתם אלהים אחרים והשתחויתם להם וחרה אף יהוה בכם ועצר את השמים ולא יהיה מטר והאדמה לא תתן את יבולה ואבדתם מהרה מעל הארץ הטבה אשר יהוה נתן לכם ושמתם את דברי אלה על לבבכם ועל נפשכם וקשרתם אתם לאות על ידכם והיו לטוטפת בין עיניכם ולמדתם אתם את בניכם לדבר בם בשבתך בביתך ובלכתך בדרך ובשכבך ובקומך וכתבתם על מזוזות ביתך ובשעריך למען ירבו ימיכם וימי בניכם על האדמה אשר נשבע יהוה לאבתיכם לתת להם כימי השמים על הארץ'
  ),

  // Genesis 1:1-5 — First day of creation
  src(
    'genesis-1-1-5',
    'First Day of Creation',
    'יום ראשון',
    'torah',
    'Genesis 1:1-5',
    'בראשית ברא אלהים את השמים ואת הארץ והארץ היתה תהו ובהו וחשך על פני תהום ורוח אלהים מרחפת על פני המים ויאמר אלהים יהי אור ויהי אור וירא אלהים את האור כי טוב ויבדל אלהים בין האור ובין החשך ויקרא אלהים לאור יום ולחשך קרא לילה ויהי ערב ויהי בקר יום אחד'
  ),

  // Priestly Blessing (Numbers 6:24-26)
  src(
    'priestly-blessing',
    'Priestly Blessing',
    'ברכת כהנים',
    'torah',
    'Numbers 6:24-26',
    'יברכך יהוה וישמרך יאר יהוה פניו אליך ויחנך ישא יהוה פניו אליך וישם לך שלום'
  ),

  // Ten Commandments opening (Exodus 20:2-6)
  src(
    'ten-commandments',
    'Ten Commandments (Opening)',
    'עשרת הדברות (פתיחה)',
    'torah',
    'Exodus 20:2-6',
    'אנכי יהוה אלהיך אשר הוצאתיך מארץ מצרים מבית עבדים לא יהיה לך אלהים אחרים על פני לא תעשה לך פסל וכל תמונה אשר בשמים ממעל ואשר בארץ מתחת ואשר במים מתחת לארץ לא תשתחוה להם ולא תעבדם כי אנכי יהוה אלהיך אל קנא פקד עון אבת על בנים על שלשים ועל רבעים לשנאי ועשה חסד לאלפים לאהבי ולשמרי מצותי'
  ),

  // Song of the Sea opening (Exodus 15:1-3)
  src(
    'song-of-sea',
    'Song of the Sea (Opening)',
    'שירת הים (פתיחה)',
    'torah',
    'Exodus 15:1-3',
    'אז ישיר משה ובני ישראל את השירה הזאת ליהוה ויאמרו לאמר אשירה ליהוה כי גאה גאה סוס ורכבו רמה בים עזי וזמרת יה ויהי לי לישועה זה אלי ואנוהו אלהי אבי וארממנהו יהוה איש מלחמה יהוה שמו'
  ),

  // Haazinu opening (Deuteronomy 32:1-4)
  src(
    'haazinu',
    'Haazinu (Opening)',
    'האזינו (פתיחה)',
    'torah',
    'Deuteronomy 32:1-4',
    'האזינו השמים ואדברה ותשמע הארץ אמרי פי יערף כמטר לקחי תזל כטל אמרתי כשעירם עלי דשא וכרביבים עלי עשב כי שם יהוה אקרא הבו גדל לאלהינו הצור תמים פעלו כי כל דרכיו משפט אל אמונה ואין עול צדיק וישר הוא'
  ),
];

// ---------------------------------------------------------------------------
// Jacob's Blessings — Genesis 49
// ---------------------------------------------------------------------------

const tribalJacob = [

  // Reuben (Genesis 49:3-4)
  src(
    'jacob-reuben',
    'Reuben',
    'ראובן',
    'tribal-jacob',
    'Genesis 49:3-4',
    'ראובן בכרי אתה כחי וראשית אוני יתר שאת ויתר עז פחז כמים אל תותר כי עלית משכבי אביך אז חללת יצועי עלה'
  ),

  // Shimon & Levi (Genesis 49:5-7)
  src(
    'jacob-shimon',
    'Shimon',
    'שמעון',
    'tribal-jacob',
    'Genesis 49:5-7',
    'שמעון ולוי אחים כלי חמס מכרתיהם בסדם אל תבא נפשי בקהלם אל תחד כבדי כי באפם הרגו איש וברצנם עקרו שור ארור אפם כי עז ועברתם כי קשתה אחלקם ביעקב ואפיצם בישראל'
  ),

  // Levi (same text as Shimon — Genesis 49:5-7)
  src(
    'jacob-levi',
    'Levi',
    'לוי',
    'tribal-jacob',
    'Genesis 49:5-7',
    'שמעון ולוי אחים כלי חמס מכרתיהם בסדם אל תבא נפשי בקהלם אל תחד כבדי כי באפם הרגו איש וברצנם עקרו שור ארור אפם כי עז ועברתם כי קשתה אחלקם ביעקב ואפיצם בישראל'
  ),

  // Judah (Genesis 49:8-12)
  src(
    'jacob-judah',
    'Judah',
    'יהודה',
    'tribal-jacob',
    'Genesis 49:8-12',
    'יהודה אתה יודוך אחיך ידך בערף איביך ישתחוו לך בני אביך גור אריה יהודה מטרף בני עלית כרע רבץ כאריה וכלביא מי יקימנו לא יסור שבט מיהודה ומחקק מבין רגליו עד כי יבא שילה ולו יקהת עמים אסרי לגפן עירה ולשרקה בני אתנו כבס ביין לבשו ודם ענבים סותה חכלילי עינים מיין ולבן שנים מחלב'
  ),

  // Zebulun (Genesis 49:13)
  src(
    'jacob-zebulun',
    'Zebulun',
    'זבולן',
    'tribal-jacob',
    'Genesis 49:13',
    'זבולן לחוף ימים ישכן והוא לחוף אניות וירכתו על צידן'
  ),

  // Issachar (Genesis 49:14-15)
  src(
    'jacob-issachar',
    'Issachar',
    'יששכר',
    'tribal-jacob',
    'Genesis 49:14-15',
    'יששכר חמר גרם רבץ בין המשפתים וירא מנחה כי טוב ואת הארץ כי נעמה ויט שכמו לסבל ויהי למס עבד'
  ),

  // Dan (Genesis 49:16-18)
  src(
    'jacob-dan',
    'Dan',
    'דן',
    'tribal-jacob',
    'Genesis 49:16-18',
    'דן ידין עמו כאחד שבטי ישראל יהי דן נחש עלי דרך שפיפן עלי ארח הנשך עקבי סוס ויפל רכבו אחור לישועתך קויתי יהוה'
  ),

  // Gad (Genesis 49:19)
  src(
    'jacob-gad',
    'Gad',
    'גד',
    'tribal-jacob',
    'Genesis 49:19',
    'גד גדוד יגודנו והוא יגד עקב'
  ),

  // Asher (Genesis 49:20)
  src(
    'jacob-asher',
    'Asher',
    'אשר',
    'tribal-jacob',
    'Genesis 49:20',
    'מאשר שמנה לחמו והוא יתן מעדני מלך'
  ),

  // Naphtali (Genesis 49:21)
  src(
    'jacob-naphtali',
    'Naphtali',
    'נפתלי',
    'tribal-jacob',
    'Genesis 49:21',
    'נפתלי אילה שלחה הנתן אמרי שפר'
  ),

  // Joseph (Genesis 49:22-26)
  src(
    'jacob-joseph',
    'Joseph',
    'יוסף',
    'tribal-jacob',
    'Genesis 49:22-26',
    'בן פרת יוסף בן פרת עלי עין בנות צעדה עלי שור וימררהו ורבו וישטמהו בעלי חצים ותשב באיתן קשתו ויפזו זרעי ידיו מידי אביר יעקב משם רעה אבן ישראל מאל אביך ויעזרך ואת שדי ויברכך ברכת שמים מעל ברכת תהום רבצת תחת ברכת שדים ורחם ברכת אביך גברו על ברכת הורי עד תאות גבעת עולם תהיין לראש יוסף ולקדקד נזיר אחיו'
  ),

  // Benjamin (Genesis 49:27)
  src(
    'jacob-benjamin',
    'Benjamin',
    'בנימין',
    'tribal-jacob',
    'Genesis 49:27',
    'בנימין זאב יטרף בבקר יאכל עד ולערב יחלק שלל'
  ),
];

// ---------------------------------------------------------------------------
// Moses' Blessings — Deuteronomy 33
// ---------------------------------------------------------------------------

const tribalMoses = [

  // Reuben (Deuteronomy 33:6)
  src(
    'moses-reuben',
    'Reuben',
    'ראובן',
    'tribal-moses',
    'Deuteronomy 33:6',
    'יחי ראובן ואל ימת ויהי מתיו מספר'
  ),

  // Judah (Deuteronomy 33:7)
  src(
    'moses-judah',
    'Judah',
    'יהודה',
    'tribal-moses',
    'Deuteronomy 33:7',
    'וזאת ליהודה ויאמר שמע יהוה קול יהודה ואל עמו תביאנו ידיו רב לו ועזר מצריו תהיה'
  ),

  // Levi (Deuteronomy 33:8-11)
  src(
    'moses-levi',
    'Levi',
    'לוי',
    'tribal-moses',
    'Deuteronomy 33:8-11',
    'וללוי אמר תמיך ואוריך לאיש חסידך אשר נסיתו במסה תריבהו על מי מריבה האמר לאביו ולאמו לא ראיתיו ואת אחיו לא הכיר ואת בניו לא ידע כי שמרו אמרתך ובריתך ינצרו יורו משפטיך ליעקב ותורתך לישראל ישימו קטורה באפך וכליל על מזבחך ברך יהוה חילו ופעל ידיו תרצה מחץ מתנים קמיו ומשנאיו מן יקומון'
  ),

  // Benjamin (Deuteronomy 33:12)
  src(
    'moses-benjamin',
    'Benjamin',
    'בנימין',
    'tribal-moses',
    'Deuteronomy 33:12',
    'לבנימן אמר ידיד יהוה ישכן לבטח עליו חפף עליו כל היום ובין כתפיו שכן'
  ),

  // Joseph (Deuteronomy 33:13-17)
  src(
    'moses-joseph',
    'Joseph',
    'יוסף',
    'tribal-moses',
    'Deuteronomy 33:13-17',
    'וליוסף אמר מברכת יהוה ארצו ממגד שמים מטל ומתהום רבצת תחת וממגד תבואת שמש וממגד גרש ירחים ומראש הררי קדם וממגד גבעות עולם וממגד ארץ ומלאה ורצון שכני סנה תבואתה לראש יוסף ולקדקד נזיר אחיו בכור שורו הדר לו וקרני ראם קרניו בהם עמים ינגח יחדו אפסי ארץ והם רבבות אפרים והם אלפי מנשה'
  ),

  // Zebulun & Issachar (Deuteronomy 33:18-19)
  src(
    'moses-zebulun',
    'Zebulun',
    'זבולן',
    'tribal-moses',
    'Deuteronomy 33:18-19',
    'שמח זבולן בצאתך ויששכר באהליך עמים הר יקראו שם יזבחו זבחי צדק כי שפע ימים יינקו ושפני טמוני חול'
  ),

  src(
    'moses-issachar',
    'Issachar',
    'יששכר',
    'tribal-moses',
    'Deuteronomy 33:18-19',
    'שמח זבולן בצאתך ויששכר באהליך עמים הר יקראו שם יזבחו זבחי צדק כי שפע ימים יינקו ושפני טמוני חול'
  ),

  // Gad (Deuteronomy 33:20-21)
  src(
    'moses-gad',
    'Gad',
    'גד',
    'tribal-moses',
    'Deuteronomy 33:20-21',
    'ברוך מרחיב גד כלביא שכן וטרף זרוע אף קדקד וירא ראשית לו כי שם חלקת מחקק ספון ויתא ראשי עם צדקת יהוה עשה ומשפטיו עם ישראל'
  ),

  // Dan (Deuteronomy 33:22)
  src(
    'moses-dan',
    'Dan',
    'דן',
    'tribal-moses',
    'Deuteronomy 33:22',
    'דן גור אריה יזנק מן הבשן'
  ),

  // Naphtali (Deuteronomy 33:23)
  src(
    'moses-naphtali',
    'Naphtali',
    'נפתלי',
    'tribal-moses',
    'Deuteronomy 33:23',
    'נפתלי שבע רצון ומלא ברכת יהוה ים ודרום ירשה'
  ),

  // Asher (Deuteronomy 33:24-25)
  src(
    'moses-asher',
    'Asher',
    'אשר',
    'tribal-moses',
    'Deuteronomy 33:24-25',
    'ברוך מבנים אשר יהי רצוי אחיו וטבל בשמן רגלו ברזל ונחשת מנעליך וכימיך דבאך'
  ),

  // Note: Shimon is omitted in Moses' blessings (Deuteronomy 33).
];

// ---------------------------------------------------------------------------
// Kabbalistic
// ---------------------------------------------------------------------------

const kabbalistic = [

  // Ana BeKoach — the 42-letter Name
  src(
    'ana-bekhoach',
    'Ana BeKoach (42-Letter Name)',
    'אנא בכח',
    'kabbalistic',
    'Ana BeKoach prayer',
    'אבגיתץ קרעשטן נגדיכש בטרצתג חקבטנע יגלפזק שקוצית'
  ),

  // Psalm 67 — the Menorah psalm
  src(
    'psalm-67',
    'Psalm 67 (Menorah Psalm)',
    'מזמור סז (מנורה)',
    'psalms',
    'Psalm 67:2-9',
    'אלהים יחננו ויברכנו יאר פניו אתנו סלה לדעת בארץ דרכך בכל גוים ישועתך יודוך עמים אלהים יודוך עמים כלם ישמחו וירננו לאמים כי תשפט עמים מישר ולאמים בארץ תנחם סלה יודוך עמים אלהים יודוך עמים כלם ארץ נתנה יבולה יברכנו אלהים אלהינו יברכנו אלהים וייראו אתו כל אפסי ארץ'
  ),
];

// ---------------------------------------------------------------------------
// Assemble full library
// ---------------------------------------------------------------------------

export const SOURCE_LIBRARY = [
  ...torah,
  ...tribalJacob,
  ...tribalMoses,
  ...kabbalistic,
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get a source entry by id, or undefined if not found. */
export function getSource(id) {
  return SOURCE_LIBRARY.find(s => s.id === id);
}

/** Get all source entries for a given category. */
export function getSourcesByCategory(category) {
  return SOURCE_LIBRARY.filter(s => s.category === category);
}

/** Get all unique category keys present in the library. */
export function getCategories() {
  return [...new Set(SOURCE_LIBRARY.map(s => s.category))];
}
