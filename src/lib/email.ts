import nodemailer from 'nodemailer';

// Create a test account if no email configuration is provided
export async function createTestAccount() {
  console.log('Creating Ethereal test account...');
  const testAccount = await nodemailer.createTestAccount();
  console.log('Test account created:', {
    user: testAccount.user,
    pass: testAccount.pass,
  });
  return {
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  };
}

// Create transporter with configuration
export async function createTransporter() {
  // Use Gmail SMTP configuration with SSL/TLS
  const config = {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: true, // Always true for port 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    debug: true,
    logger: true
  };

  console.log('Creating email transporter with config:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.auth.user },
  });

  const transporter = nodemailer.createTransport(config);

  // Verify SMTP connection configuration
  try {
    const verifyResult = await transporter.verify();
    console.log('SMTP connection verified successfully:', verifyResult);
  } catch (err) {
    const error = err as Error;
    console.error('SMTP connection verification failed:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }

  return transporter;
}

// Send email using the configured transporter
export async function sendEmail({ to, subject, text, html }: { 
  to: string; 
  subject: string; 
  text?: string; 
  html?: string; 
}) {
  console.log('Starting email send process...');
  console.log('Email configuration:', {
    from: process.env.EMAIL_FROM,
    to,
    subject
  });

  const transporter = await createTransporter();
  
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    });

    console.log('Email sent successfully:', {
      messageId: info.messageId,
      response: info.response,
      envelope: info.envelope,
      accepted: info.accepted,
      rejected: info.rejected,
      pending: info.pending
    });

    return info;
  } catch (err) {
    const error = err as Error & {
      code?: string;
      response?: string;
      responseCode?: string;
      command?: string;
    };
    
    console.error('Failed to send email:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
      command: error.command
    });
    throw error;
  }
} 