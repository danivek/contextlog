const os = require('os');
const useragent = require('useragent');


function getOsInfo() {
  return {
    hostname: os.hostname(),
    plateform: os.platform(),
    loadavg: os.loadavg(),
    uptime: os.uptime(),
    freemem: os.freemem(),
  };
}

function getProcessInfo() {
  return {
    pid: process.pid,
    uid: process.getuid ? process.getuid() : null,
    gid: process.getgid ? process.getgid() : null,
    cwd: process.cwd(),
    execPath: process.execPath,
    version: process.version,
    argv: process.argv,
    memoryUsage: process.memoryUsage(),
  };
}

class Contextlog {
  constructor(options) {
    const opts = options || {};
    this.options = {};
    this.MASK_URL_PARAMS = ['x-api-key'];
    this.MASK_HEADERS = ['authorization', 'x-api-key'];

    // this.options.skip = opts.skip;
    this.options.skipUrls = opts.skipUrls;
    this.options.maskUrlParams = this.MASK_URL_PARAMS.concat(opts.maskUrlParams || []);
    this.options.maskHeaders = this.MASK_HEADERS.concat(opts.maskHeaders || []);
    this.options.application = opts.application;
    this.options.user = opts.user;
    this.options.resource = opts.resource;
    this.options.custom = opts.custom;
    this.options.parseUserAgent = opts.parseUserAgent || false;
    this.options.reqBody = opts.reqBody || false;
    this.options.resBody = opts.resBody || false;
    this.options.body = opts.body;
  }

  mask(string) {
    if (string) {
      const bytes = [];
      for (let i = 0; i < string.length; i += 1) {
        bytes.push('*');
      }
      return bytes.join('');
    }

    return string;
  }

  maskUrl(url) {
    const regex = new RegExp(`(\\?|\\&)(${this.options.maskUrlParams.join('|')})\\=([^&]+)`, 'gi');
    return url.replace(regex, (match, p1, p2, p3) => `${p1 + p2}=${this.mask(p3)}`);
  }

  maskAuthorizationHeader(value) {
    const tokenValue = value.split(' ');
    if (tokenValue && tokenValue.length === 2) {
      tokenValue[1] = this.mask(tokenValue[1]);
      return tokenValue.join(' ');
    }

    return this.mask(value);
  }

  maskHeaders(headers) {
    Object.keys(headers).forEach((key) => {
      if (this.options.maskHeaders.indexOf(key) > -1) {
        if (key === 'authorization') {
          headers[key] = this.maskAuthorizationHeader(headers[key]);
        } else {
          headers[key] = this.mask(headers[key]);
        }
      }
    });

    return headers;
  }

  getRequestResponseInfo(req, res) {
    const context = {
      req: {
        httpVersion: req.httpVersion,
        remoteAddress: req.ip || req._remoteAddress || (req.connection && req.connection.remoteAddress),
        url: this.maskUrl(req.originalUrl || req.url),
        method: req.method,
        headers: this.maskHeaders(req.headers),

      },
      res: {
        statusCode: res.statusCode,
        headers: this.maskHeaders(res._headers),
      },
    };

    if (this.options.reqBody) {
      if (typeof this.options.reqBody === 'function' && req.body) {
        context.req.body = this.options.reqBody(req.body);
      } else {
        context.req.body = req.body;
      }
    }

    if (this.options.reqBody) {
      if (typeof this.options.resBody === 'function' && res.body) {
        context.res.body = this.options.resBody(res.body);
      } else {
        context.res.body = res.body;
      }
    }

    if (this.options.parseUserAgent) {
      const userAgent = useragent.parse(req.headers['user-agent']);
      context.req.userAgent = userAgent.toJSON();
    }

    return context;
  }

  standard({ req, res }, context) {
    const ctx = {
      date: new Date().toISOString(),
    };

    if (this.options.application) {
      ctx.application = this.options.application;
    }

    if (this.options.user) {
      ctx.user = this.options.user({ req, res }, context);
    }

    if (this.options.resource) {
      ctx.resource = this.options.resource({ req, res }, context);
    }

    if (this.options.custom) {
      Object.assign(ctx, this.options.custom({ req, res }, context));
    }

    return ctx;
  }

  request({ req, res }, context) {
    // Skip urls
    if (this.options.skipUrls) {
      const url = req.originalUrl || req.url;
      const skip = this.options.skipUrls.find(regex => url.match(regex));
      if (skip) return undefined;
    }

    const meta = Object.assign({}, this.standard({ req, res }, context));
    Object.assign(meta, this.getRequestResponseInfo(req, res));

    return meta;
  }

  error(error, { req, res }, context) {
    const meta = Object.assign({}, this.standard({ req, res }, context));
    const errorMeta = {
      error: true,
      os: getOsInfo(),
      process: getProcessInfo(),
      message: error.message,
      stack: error.stack,
    };
    Object.assign(meta, errorMeta);
    Object.assign(meta, this.getRequestResponseInfo(req, res));

    return meta;
  }
}

module.exports = Contextlog;
