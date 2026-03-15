// ═══════════════════════════════════════════════════════
//  utils/email.js  –  The Messenger Seagull 📧
//
//  Nodemailer handles sending real emails.
//  We configure one "transporter" (the mail server connection)
//  and export helper functions for each email type.
//
//  We use Gmail here. For production you can swap to
//  SendGrid, Resend, or any SMTP provider.
// ═══════════════════════════════════════════════════════

const nodemailer = require('nodemailer');

// ── Create the transporter once ──────────────────────
// A transporter = the configured mail-sending connection.
// Think of it like setting up your email client settings.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,  // your gmail address
    pass: process.env.EMAIL_PASS,  // your Gmail App Password (NOT real password)
  },
});

// ── sendRegistrationEmail ─────────────────────────────
// Called right after a user successfully registers.
// Sends a beautiful parchment-themed HTML email.
const sendRegistrationEmail = async ({ to, username, pirateName, teamName, joinCode }) => {
  const displayName = pirateName || username;

  const mailOptions = {
    from:    process.env.EMAIL_FROM || 'MLRITM Treasure Hunt <noreply@mlritm.com>',
    to,
    subject: '⚓ Welcome to Treasure Hunt — VALOROUS 2K26!',

    // Plain text fallback for email clients that don't support HTML
    text: `Welcome aboard, ${displayName}! You're registered for MLRITM Treasure Hunt VALOROUS 2K26. ${teamName ? `Your crew: ${teamName} | Join Code: ${joinCode}` : 'You can create or join a crew from your dashboard.'}`,

    // ── HTML Email Template ────────────────────────
    // Styled to match the poster: parchment, dark brown, compass rose theme
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to Treasure Hunt</title>
</head>
<body style="margin:0;padding:0;background:#1a0f05;font-family:Georgia,serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a0f05;padding:30px 0;">
    <tr><td align="center">

      <!-- Card -->
      <table width="600" cellpadding="0" cellspacing="0" style="
        max-width:600px;width:100%;
        background: linear-gradient(160deg, #f5e6c8 0%, #e8d5a3 40%, #d4b878 100%);
        border-radius:8px;
        border:3px solid #5c3a1e;
        box-shadow:0 0 40px rgba(0,0,0,0.6);
        overflow:hidden;
      ">

        <!-- Header bar -->
        <tr>
          <td style="background:#2c1a0e;padding:0;text-align:center;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:6px 20px;text-align:left;">
                  <span style="color:#c8a84b;font-size:10px;font-family:Arial,sans-serif;letter-spacing:3px;text-transform:uppercase;">
                    MLRITM · DUNDIGAL
                  </span>
                </td>
                <td style="padding:6px 20px;text-align:right;">
                  <span style="color:#c8a84b;font-size:10px;font-family:Arial,sans-serif;letter-spacing:3px;text-transform:uppercase;">
                    CSE DEPT
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- College name banner -->
        <tr>
          <td style="background:#3d2008;padding:16px 24px;text-align:center;border-bottom:2px solid #c8a84b;">
            <p style="margin:0;color:#f5e6c8;font-size:13px;font-family:Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;">
              MARRI LAXMAN REDDY INSTITUTE OF TECHNOLOGY AND MANAGEMENT
            </p>
            <p style="margin:4px 0 0;color:#c8a84b;font-size:11px;font-family:Arial,sans-serif;letter-spacing:1px;">
              Department of Computer Science and Engineering
            </p>
          </td>
        </tr>

        <!-- Main parchment body -->
        <tr>
          <td style="padding:40px 48px;text-align:center;background:url('https://www.transparenttextures.com/patterns/old-mathematics.png'),linear-gradient(160deg,#f5e6c8,#e0c97a);">

            <!-- Compass decoration -->
            <div style="font-size:56px;margin-bottom:8px;">🧭</div>

            <!-- Title scroll -->
            <div style="
              background:linear-gradient(135deg,#3d2008,#5c3a1e);
              border-radius:4px;
              padding:14px 32px;
              display:inline-block;
              margin-bottom:24px;
              border:1px solid #c8a84b;
            ">
              <h1 style="margin:0;color:#f0c93a;font-size:28px;font-family:Georgia,serif;letter-spacing:3px;text-shadow:0 2px 8px rgba(0,0,0,0.5);">
                TREASURE HUNT
              </h1>
              <p style="margin:4px 0 0;color:#c8a84b;font-size:13px;font-family:Arial,sans-serif;letter-spacing:6px;">
                VALOROUS 2K26
              </p>
            </div>

            <!-- Welcome message -->
            <p style="
              font-size:17px;color:#3d2008;margin:0 0 8px;
              font-family:Georgia,serif;font-style:italic;
            ">
              Ahoy, <strong style="font-style:normal;">${displayName}</strong>!
            </p>
            <p style="font-size:15px;color:#5c3a1e;margin:0 0 28px;font-family:Georgia,serif;">
              Ye have successfully enlisted in the greatest technical adventure of <strong>VALOROUS 2K26</strong>.
              The treasure awaits those bold enough to claim it!
            </p>

            <!-- Divider with X marks the spot -->
            <div style="margin:0 0 28px;text-align:center;">
              <span style="color:#8b4513;font-size:20px;">— ✦ ✦ ✦ —</span>
            </div>

            <!-- Details box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="
              background:rgba(60,32,8,0.08);
              border:1px solid #8b6914;
              border-radius:4px;
              margin-bottom:28px;
            ">
              <tr>
                <td style="padding:20px 24px;">
                  <table width="100%" cellpadding="6" cellspacing="0">
                    <tr>
                      <td style="color:#5c3a1e;font-size:12px;font-family:Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;width:40%;border-bottom:1px solid rgba(139,105,20,0.3);">
                        ⚓ Pirate Name
                      </td>
                      <td style="color:#2c1a0e;font-size:15px;font-family:Georgia,serif;font-weight:bold;border-bottom:1px solid rgba(139,105,20,0.3);">
                        ${displayName}
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#5c3a1e;font-size:12px;font-family:Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid rgba(139,105,20,0.3);padding-top:10px;">
                        📧 Email
                      </td>
                      <td style="color:#2c1a0e;font-size:14px;font-family:Georgia,serif;border-bottom:1px solid rgba(139,105,20,0.3);padding-top:10px;">
                        ${to}
                      </td>
                    </tr>
                    ${teamName ? `
                    <tr>
                      <td style="color:#5c3a1e;font-size:12px;font-family:Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid rgba(139,105,20,0.3);padding-top:10px;">
                        🚢 Crew
                      </td>
                      <td style="color:#2c1a0e;font-size:15px;font-family:Georgia,serif;font-weight:bold;border-bottom:1px solid rgba(139,105,20,0.3);padding-top:10px;">
                        ${teamName}
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#5c3a1e;font-size:12px;font-family:Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;padding-top:10px;">
                        🗝️ Join Code
                      </td>
                      <td style="padding-top:10px;">
                        <span style="
                          font-family:'Courier New',monospace;
                          font-size:22px;
                          font-weight:bold;
                          color:#8b0000;
                          letter-spacing:6px;
                          background:rgba(139,0,0,0.08);
                          padding:4px 12px;
                          border-radius:3px;
                          border:1px solid rgba(139,0,0,0.2);
                        ">${joinCode}</span>
                        <p style="margin:4px 0 0;font-size:11px;color:#8b6914;font-family:Arial,sans-serif;">Share with teammates to join your crew</p>
                      </td>
                    </tr>
                    ` : `
                    <tr>
                      <td colspan="2" style="padding-top:12px;color:#8b6914;font-size:13px;font-family:Georgia,serif;font-style:italic;">
                        🦜 You can create or join a crew from your dashboard!
                      </td>
                    </tr>
                    `}
                  </table>
                </td>
              </tr>
            </table>

            <!-- What happens next -->
            <div style="text-align:left;margin-bottom:28px;">
              <p style="
                font-size:13px;font-family:Arial,sans-serif;letter-spacing:2px;
                text-transform:uppercase;color:#5c3a1e;margin:0 0 12px;
              ">🗺️ The Hunt Awaits:</p>
              <table cellpadding="6" cellspacing="0" width="100%">
                ${['📜 Round 1 — Technical Quiz (15 min)', '🗺️ Round 2 — Clue Hunt (20 min)', '💎 Round 3 — Master Challenge (30 min)'].map((r, i) => `
                <tr>
                  <td style="color:#3d2008;font-size:14px;font-family:Georgia,serif;padding:6px 0;border-bottom:1px dashed rgba(139,105,20,0.3);">
                    ${r}
                  </td>
                </tr>`).join('')}
              </table>
            </div>

            <!-- CTA Button -->
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard"
               style="
                 display:inline-block;
                 background:linear-gradient(135deg,#3d2008,#5c3a1e);
                 color:#f0c93a;
                 font-family:Arial,sans-serif;
                 font-size:14px;
                 font-weight:bold;
                 letter-spacing:3px;
                 text-transform:uppercase;
                 text-decoration:none;
                 padding:16px 48px;
                 border-radius:4px;
                 border:1px solid #c8a84b;
                 margin-bottom:24px;
               ">
              ⚓ Board Your Ship
            </a>

            <p style="font-size:13px;color:#8b6914;font-family:Georgia,serif;font-style:italic;margin-top:20px;">
              "X marks the spot — dare you find it?"
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#2c1a0e;padding:16px 24px;text-align:center;border-top:2px solid #c8a84b;">
            <p style="margin:0 0 6px;color:#c8a84b;font-size:11px;font-family:Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;">
              MLRITM · Dundigal · CSE Department
            </p>
            <p style="margin:0;color:#5c3a1e;font-size:11px;font-family:Arial,sans-serif;">
              This is an automated message. Do not reply to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  };

  // Actually send the email
  // In development, log the result. In production remove the console.log.
  const info = await transporter.sendMail(mailOptions);
  console.log(`📧 Registration email sent to ${to} — Message ID: ${info.messageId}`);
  return info;
};

module.exports = { sendRegistrationEmail };
