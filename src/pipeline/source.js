// ── Source text management ────────────────────────────────────────────
// Provides preset source texts and display variants for the pipeline.
// No DOM manipulation — pure data.

// Mezuzah text (Deuteronomy 6:4-9 + 11:13-21) - 713 letters
export const MEZUZAH_DISPLAY = 'שמע ישראל יהוה אלהינו יהוה אחד ואהבת את יהוה אלהיך בכל לבבך ובכל נפשך ובכל מאדך והיו הדברים האלה אשר אנכי מצוך היום על לבבך ושננתם לבניך ודברת בם בשבתך בביתך ובלכתך בדרך ובשכבך ובקומך וקשרתם לאות על ידך והיו לטטפת בין עיניך וכתבתם על מזזות ביתך ובשעריך והיה אם שמע תשמעו אל מצותי אשר אנכי מצוה אתכם היום לאהבה את יהוה אלהיכם ולעבדו בכל לבבכם ובכל נפשכם ונתתי מטר ארצכם בעתו יורה ומלקוש ואספת דגנך ותירשך ויצהרך ונתתי עשב בשדך לבהמתך ואכלת ושבעת השמרו לכם פן יפתה לבבכם וסרתם ועבדתם אלהים אחרים והשתחויתם להם וחרה אף יהוה בכם ועצר את השמים ולא יהיה מטר והאדמה לא תתן את יבולה ואבדתם מהרה מעל הארץ הטבה אשר יהוה נתן לכם ושמתם את דברי אלה על לבבכם ועל נפשכם וקשרתם אתם לאות על ידכם והיו לטוטפת בין עיניכם ולמדתם אתם את בניכם לדבר בם בשבתך בביתך ובלכתך בדרך ובשכבך ובקומך וכתבתם על מזוזות ביתך ובשעריך למען ירבו ימיכם וימי בניכם על האדמה אשר נשבע יהוה לאבתיכם לתת להם כימי השמים על הארץ';
export const MEZUZAH_TEXT = MEZUZAH_DISPLAY.replace(/\s/g, '');

export const GENESIS_DISPLAY = 'בראשית ברא אלהים את השמים ואת הארץ';
export const GENESIS_TEXT = GENESIS_DISPLAY.replace(/\s/g, '');

export const SOURCE_PRESETS = {
  mezuzah: MEZUZAH_TEXT,
  genesis: GENESIS_TEXT,
};

export const SOURCE_DISPLAY = {
  mezuzah: MEZUZAH_DISPLAY,
  genesis: GENESIS_DISPLAY,
};
