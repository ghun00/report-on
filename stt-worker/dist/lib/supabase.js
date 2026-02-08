"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STORAGE_BUCKET = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}
exports.supabase = (0, supabase_js_1.createClient)(url, key, {
    auth: { persistSession: false },
});
exports.STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "audio";
