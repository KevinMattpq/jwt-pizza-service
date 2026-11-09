const os = require('os');
const config = require('./config.js');

// ---- In-memory state ----
const requests = {};                 // { GET: n, POST: n, ... } cumulative
const latency = { totalMs: 0, count: 0 };        // endpoint latency (per period)
const auth = { success: 0, failure: 0 };         // cumulative
let activeUsers = 0;
const pizza = { sold: 0, failures: 0, revenue: 0 };          // cumulative
const pizzaLatency = { totalMs: 0, count: 0 };   // factory latency (per period)

// ---- Middleware: requests by method + latency ----
function requestTracker(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    requests[req.method] = (requests[req.method] || 0) + 1;
    latency.totalMs += Date.now() - start;
    latency.count++;
  });
  next();
}

// ---- Functions called by the routers ----
function authAttempt(success) {
  success ? auth.success++ : auth.failure++;
}

function activeUserChange(delta) {
  activeUsers = Math.max(0, activeUsers + delta);
}

function pizzaPurchase(success, latencyMs, price, count) {
  if (success) {
    pizza.sold += count;
    pizza.revenue += price;
  } else {
    pizza.failures++;
  }
  pizzaLatency.totalMs += latencyMs;
  pizzaLatency.count++;
}

// ---- System ----
function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return Number((cpuUsage * 100).toFixed(2));
}

function getMemoryUsagePercentage() {
  const used = os.totalmem() - os.freemem();
  return Number(((used / os.totalmem()) * 100).toFixed(2));
}

// ---- Periodic sending ----
function sendMetricsPeriodically(period) {
  const timer = setInterval(() => {
    try {
      const metrics = [];

      // HTTP
      Object.keys(requests).forEach((method) => {
        metrics.push(createMetric('requests', requests[method], '1', 'sum', 'asInt', { method }));
      });

      if (latency.count > 0) {
        metrics.push(createMetric('endpoint_latency', latency.totalMs / latency.count, 'ms', 'gauge', 'asDouble', {}));
      }
      latency.totalMs = 0;
      latency.count = 0;

      // Auth & users
      metrics.push(createMetric('auth_attempts', auth.success, '1', 'sum', 'asInt', { result: 'success' }));
      metrics.push(createMetric('auth_attempts', auth.failure, '1', 'sum', 'asInt', { result: 'failure' }));
      metrics.push(createMetric('active_users', activeUsers, '1', 'gauge', 'asInt', {}));

      // System
      metrics.push(createMetric('cpu', getCpuUsagePercentage(), '%', 'gauge', 'asDouble', {}));
      metrics.push(createMetric('memory', getMemoryUsagePercentage(), '%', 'gauge', 'asDouble', {}));

      // Pizzas
      metrics.push(createMetric('pizzas_sold', pizza.sold, '1', 'sum', 'asInt', {}));
      metrics.push(createMetric('pizza_failures', pizza.failures, '1', 'sum', 'asInt', {}));
      metrics.push(createMetric('revenue', pizza.revenue, '1', 'sum', 'asDouble', {}));
      if (pizzaLatency.count > 0) {
        metrics.push(createMetric('pizza_latency', pizzaLatency.totalMs / pizzaLatency.count, 'ms', 'gauge', 'asDouble', {}));
      }
      pizzaLatency.totalMs = 0;
      pizzaLatency.count = 0;

      sendMetricToGrafana(metrics);
    } catch (error) {
      console.log('Error sending metrics', error);
    }
  }, period);
  timer.unref();
}

function createMetric(metricName, metricValue, metricUnit, metricType, valueType, attributes) {
  attributes = { ...attributes, source: config.metrics.source };

  const metric = {
    name: metricName,
    unit: metricUnit,
    [metricType]: {
      dataPoints: [
        {
          [valueType]: metricValue,
          timeUnixNano: Date.now() * 1000000,
          attributes: [],
        },
      ],
    },
  };

  Object.keys(attributes).forEach((key) => {
    metric[metricType].dataPoints[0].attributes.push({
      key: key,
      value: { stringValue: String(attributes[key]) },
    });
  });

  if (metricType === 'sum') {
    metric[metricType].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
    metric[metricType].isMonotonic = true;
  }

  return metric;
}

function sendMetricToGrafana(metrics) {
  const body = { resourceMetrics: [{ scopeMetrics: [{ metrics }] }] };

  fetch(config.metrics.endpointUrl, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${config.metrics.accountId}:${config.metrics.apiKey}`,
      'Content-Type': 'application/json',
    },
  })
    .then((response) => {
      if (!response.ok) {
        response.text().then((text) => console.error(`Failed to push metrics: ${text}`));
      }
    })
    .catch((error) => console.error('Error pushing metrics:', error));
}

if (process.env.NODE_ENV !== 'test') {
  sendMetricsPeriodically(10000);
}

module.exports = { requestTracker, authAttempt, activeUserChange, pizzaPurchase };