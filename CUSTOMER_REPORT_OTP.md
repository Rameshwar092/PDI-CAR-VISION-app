# Customer "Get your PDI report" (OTP)

Customers open **`https://<your-pdi-app-domain>/get-report`**, enter the mobile
number given at the time of inspection, receive a 6-digit OTP by SMS, and then
see / download / print their own submitted PDI reports.

## 1. Add the button to your website

Paste this wherever you want the button (replace the domain with the one your
PDI web app is deployed on, e.g. your Vercel URL):

```html
<a href="https://YOUR-PDI-APP-DOMAIN/get-report"
   style="display:inline-block;background:#2f6fe4;color:#fff;padding:12px 22px;
          border-radius:8px;font-weight:600;text-decoration:none;font-family:sans-serif">
  Get your PDI Report
</a>
```

Optional: pre-fill the number with `.../get-report?mobile=9876543210`.

## 2. Choose an SMS provider (backend `.env`)

| Provider | Settings |
|---|---|
| Testing only | `SMS_PROVIDER=console` (OTP is printed in the backend log, no SMS) |
| MSG91 | `SMS_PROVIDER=msg91`, `MSG91_AUTH_KEY`, `MSG91_OTP_TEMPLATE_ID` |
| Fast2SMS | `SMS_PROVIDER=fast2sms`, `FAST2SMS_API_KEY`, `FAST2SMS_SENDER_ID`, `FAST2SMS_TEMPLATE_ID` |
| Twilio | `SMS_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` |

India: OTP SMS must use a **DLT-registered** sender ID and template (TRAI rule).
Suggested template text (register it with your provider):

> `{#var#} is your OTP to view your PDI report from PDI Car Vision. Valid for 5 minutes. Do not share it with anyone.`

Also run `pip install -r requirements.txt` again (adds `httpx`) and add your
website/app domain to `CORS_ORIGINS`.

## 3. How it is protected

- OTP: 6 digits, valid 5 minutes, single use, stored only as a hash.
- 5 wrong tries locks that OTP; max 1 OTP per 30 s and 5 per hour per number; 20 requests/hour per IP.
- The page gives the same answer whether or not a number has a report, and no SMS is
  sent to numbers without a report (so nobody can use it to find your customers, and no SMS credits are wasted).
- Customers see **only Submitted** reports whose customer mobile matches the verified number. Drafts are never shown.
- The customer session lasts 30 minutes, is kept only for that browser tab, and can't use any staff API.
- Inspectors must enter the customer's mobile number correctly in the PDI form; that's the link.
  Old reports are linked automatically the first time the backend starts.

## Files

- Backend: `app/routers/customer.py` (endpoints), `app/services/sms.py` (SMS providers),
  `app/services/phone.py`, plus small changes in `config.py`, `database.py`, `main.py`, `routers/pdi.py`, `security.py`.
- Frontend: `src/pages/customer/GetReport.jsx`, `src/services/customerApi.js`, routes in
  `src/routes/AppRoutes.jsx`, styles at the end of `src/style.css`.
