// املأ القيم التالية من مشروع Supabase الخاص بك
// لا تنشر المفاتيح الحساسة علنًا. هذا الملف للاستخدام التجريبي أو ضمن بيئة موثوقة.
window.SUPABASE_URL = "https://fwqickaaqqcynpzuwdso.supabase.co"; // مثال: https://xyzcompany.supabase.co
window.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3cWlja2FhcXFjeW5wenV3ZHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNjk5NTAsImV4cCI6MjA3OTY0NTk1MH0.VdZoBCuiUzjGV3qoZ856nBkrctyDSFkx-5RLLAyDBoc"; // المفتاح العام (anon)

// استدعاء عبر بوابة Supabase (gateway) ليتطابق مع curl العامل، وسيضيف app.js الرؤوس تلقائيًا
window.NEW_ORDER_FUNCTION_URL = "https://fwqickaaqqcynpzuwdso.supabase.co/functions/v1/notify-new-order";
// إن رغبت باستخدام gateway: اترك السطر أعلاه فارغًا واستعمل التالي، مع ضرورة تهيئة CORS داخل الدالة للسماح بـ 'apikey'
// window.NEW_ORDER_FUNCTION_URL_BASE = window.SUPABASE_URL; // ثم عرّف window.NEW_ORDER_FUNCTION_NAME = 'super-responder'

// لا نحدد STORE_TOPIC هنا ليتم اشتقاق الـ topic تلقائيًا من اسم المتجر (stores.name) داخل app.js
