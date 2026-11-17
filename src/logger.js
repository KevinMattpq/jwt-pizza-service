const config = require('./config');

class Logger {
  httpLogger = (req, res, next) => {
    const send = res.send;
    res.send = (resBody) => {
      const logData = {
        authorized: !!req.headers.authorization,
        user: req.user ? { id: req.user.id, email: req.user.email } : null,
        path: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        reqBody: req.body,
        resBody: this.parse(resBody),
      };
      this.log(this.statusToLogLevel(res.statusCode), 'http', logData);
      res.send = send;
      return res.send(resBody);
    };
    next();
  };

  dbLogger(sql, user) {
    const safeSql = sql.replace(/password='[^']*'/gi, "password='*****'");
    this.log('info', 'db', { sql: safeSql, user: user ?? null });
  }

  factoryLogger(user, reqBody, resBody, statusCode) {
    const level = this.statusToLogLevel(statusCode);
    this.log(level, 'factory', { user: user ?? null, statusCode, reqBody, resBody });
  }

  unhandledErrorLogger(err, req) {
    this.log('error', 'unhandledError', {
      message: err.message,
      stack: err.stack,
      path: req?.originalUrl,
      method: req?.method,
    });
  }

  log(level, type, logData) {
    const labels = { component: config.logging.source, level, type };
    const values = [this.nowString(), this.sanitize(logData)];
    const logEvent = { streams: [{ stream: labels, values: [values] }] };
    this.sendLogToGrafana(logEvent);
  }

  statusToLogLevel(statusCode) {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }

  nowString() {
    return (Math.floor(Date.now()) * 1000000).toString();
  }

  parse(body) {
    if (typeof body !== 'string') return body;
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }

  sanitize(logData) {
    let s = JSON.stringify(logData);
    s = s.replace(/"password":\s*"[^"]*"/g, '"password":"*****"');
    s = s.replace(/"token":\s*"[^"]*"/g, '"token":"*****"');
    s = s.replace(/"jwt":\s*"[^"]*"/g, '"jwt":"*****"');
    s = s.replace(/"apiKey":\s*"[^"]*"/g, '"apiKey":"*****"');
    return s;
  }

  sendLogToGrafana(event) {
    const body = JSON.stringify(event);
    fetch(config.logging.endpointUrl, {
      method: 'post',
      body,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.logging.accountId}:${config.logging.apiKey}`,
      },
    })
      .then((res) => {
        if (!res.ok) console.log('Failed to send log to Grafana');
      })
      .catch(() => {});
  }
}

module.exports = new Logger();