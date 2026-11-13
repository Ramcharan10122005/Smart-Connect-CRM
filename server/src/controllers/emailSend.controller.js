import * as emailSendService from '../services/emailSend.service.js';
import { successResponse } from '../utils/response.js';

export async function sendEmail(req, res) {
  const result = await emailSendService.sendUserEmail(req.body, req.user);
  return successResponse(res, result, {}, 200);
}

export async function getEmailLogs(req, res) {
  const { logs, meta } = await emailSendService.getEmailLogs(req.query);
  return successResponse(res, logs, meta);
}

export async function handleUnsubscribe(req, res) {
  const { token } = req.params;
  try {
    const result = await emailSendService.optOutByToken(token);

    if (req.accepts('html')) {
      return res.render('unsubscribe', {
        title: 'Unsubscribe Confirmation',
        success: true,
        contact: result.contact,
        message: result.message,
      });
    }

    return successResponse(res, result);
  } catch (err) {
    if (req.accepts('html')) {
      return res.status(400).render('unsubscribe', {
        title: 'Unsubscribe Error',
        success: false,
        contact: null,
        message: err.message || 'Invalid or expired unsubscribe link',
      });
    }
    throw err;
  }
}

export default {
  sendEmail,
  getEmailLogs,
  handleUnsubscribe,
};

