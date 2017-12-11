# contextlog
[![Build Status](https://travis-ci.org/danivek/contextlog.svg?branch=master)](https://travis-ci.org/danivek/contextlog)
[![Coverage Status](https://coveralls.io/repos/github/danivek/contextlog/badge.svg?branch=master)](https://coveralls.io/github/danivek/contextlog?branch=master)
[![npm](https://img.shields.io/npm/v/contextlog.svg)](https://www.npmjs.org/package/contextlog)

Structured context logging for NodeJS.

Build a context object from HTTP request/response informations for your favorite logger.

Allows you to do rich application monitoring/auditing by providing metadata for your logs.

## Motivation
One logging best practice is to log as much as you can!
The more you log, the bigger the chances are that you will get the right information when debugging or trying to understand what happened.

Adding context to log allow you to answer the following questions:
- What happened?
- What it contains?
- When did it happen?
- Who initiated it?
- On what did it happen?

## Supported features
- Logger agnostic 
- Structured format
- Request/response context
- Error context with stacktrace, os, process info
- Mask sensitive data like Authorization header, url parameters, etc.
- Exclude specific URLs from logging

## Installation

```bash
npm install --save contextlog
```
## Usage

```javascript
const Contextlog = require('contextlog');
const pkg = require('./package.json');

const contextlog = new Contextlog({
  skipUrls: [/\/docs/],
  application: { 
    name: pkg.name, 
    version: pkg.version 
  },
  user: ({req}, context) => ({
    id: req.user && req.user.id
  }),
  resource: ({req}, context) => ({
    type: req.params.resourceType,
    id: req.params.id
  }),
  custom: ({ req }) => ({ custom: req.custom }),
  reqBody: (body) => {
    body.password = contextlog.mask(body.password);
    return body;
  },
  resBody: true
});
```

**Options:**
  - **skipUrls** (optional): Array of regex to skip/exclude specific URLs from logging.
  - **application** (optional): *object* or *function*. Describes the application context.
  - **user** (optional): *object* or *function*. Describes the user context.
  - **resource** (optional): *object* or *function*. Describes the resource context.
  - **custom** (optional): *object* or *function*. Add custom metadata to top-level.
  - **reqBody** (optional): *boolean* or *function*. include/filter req.body. Default = false.
  - **resBody** (optional): *boolean* or *function*. include/filter req.body. Default = false.
  - **maskUrlParams** (optional): Array of url parameters to mask.
  - **maskHeaders** (optional): Array of headers to mask on req and res.
  - **parseUserAgent**: *boolean* to indicate if 'user-agent' header should be parsed using [useragent](https://github.com/3rd-Eden/useragent) and added to `req.userAgent`. Default = false.

### standard({ req, res }, [context])
```javascript
contextlog.standard({ req, res });
```

```json
{
  "date": "2017-12-09T17:36:24.655Z",
  "application": {
    "name": "contextlog",
    "version": "1.0.0"
  },
  "user": {
    "id": "john.doe"
  },
  "resource": {
    "type": "user",
    "id": "1"
  },
  "custom": "custom"
}
```
### request({ req, res }, [context])
```javascript
contextlog.request({ req, res });
```

```json
{
  "date": "2017-12-09T17:36:24.655Z",
  "application": {
    "name": "contextlog",
    "version": "1.0.0"
  },
  "user": {
    "id": "john.doe"
  },
  "resource": {
    "type": "user",
    "id": "1"
  },
  "custom": "custom",
  "req": {
    "httpVersion": "1.1",
    "remoteAddress": "192.168.1.1",
    "url": "/path/to/endpoint",
    "method": "POST",
    "headers": {
      "host": "localhost",
      "connection": "keep-alive",
      "Authorization": "Basic *********"
    },
    "body": {
      "data": "data",
      "password": "********"
    }
  },
  "res": {
    "statusCode": "200",
    "headers": {
      "content-type": "application/json; charset=utf-8"
    },
    "body": {
      "data": "data"
    }
  }
}
```
### error(err, { req, res }, [context])
```javascript
contextlog.error(err, { req, res })
```

```json
{
  "date": "2017-12-09T17:36:24.655Z",
  "application": {
    "name": "contextlog",
    "version": "1.0.0"
  },
  "user": {
    "id": "john.doe"
  },
  "resource": {
    "type": "user",
    "id": "1"
  },
  "custom": "custom",
  "error": true,
  "os": {
    "hostname": "localhost",
    "plateform": "win32",
    "loadavg": [
      0,
      0,
      0
    ],
    "uptime": 874049.5096699,
    "freemem": 8310415360
  },
  "process": {
    "pid": 33636,
    "uid": null,
    "gid": null,
    "cwd": "C:\\Users\\contextlog",
    "execPath": "C:\\Program Files\\nodejs\\node.exe",
    "version": "v8.9.1",
    "argv": [
      "node",
      "C:\\Users\\contextlog\\node_modules\\mocha\\bin\\_mocha",
      "-R",
      "spec",
      "./test/**/*.js"
    ],
    "memoryUsage": {
      "rss": 50888704,
      "heapTotal": 34512896,
      "heapUsed": 21474088,
      "external": 1463895
    }
  },
  "message": "boom",
  "stack": "Error: boom\n    at Context.it (C:\\Users\\contextlog\\test\\unit\\Contextlog.test.js:266:19)\n    at callFnAsync (C:\\Users\\contextlog\\node_modules\\mocha\\lib\\runnable.js:377:21)\n    at Test.Runnable.run ...",
  "req": {
    "httpVersion": "1.1",
    "remoteAddress": "192.168.1.1",
    "url": "/path/to/endpoint",
    "method": "POST",
    "headers": {
      "host": "localhost",
      "connection": "keep-alive",
      "Authorization": "Basic *********"
    },
    "body": {
      "data": "data",
      "password": "********"
    }
  },
  "res": {
    "statusCode": "200",
    "headers": {
      "content-type": "application/json; charset=utf-8"
    },
    "body": {
      "data": "data"
    }
  }
}
```
## Mask sensitive data

contextlog do some default masking of common sensitive data on url parameters and req/res headers: 
- Url params: ['x-api-key']
- Headers: ['authorization', 'x-api-key']

It also provides some utilities functions to mask sensitive data:

### mask(string)

```javascript
contextlog.mask(body.password)
```

### maskUrl(url)

```javascript
const contextlog = new Contextlog({
  maskUrlParams: ['mask'],
});
contextlog.maskUrl('/path/to/endpoint?x-api-key=shouldbemask&mask=shouldbemask&notmask=shouldnotbemask');
// => '/path/to/endpoint?x-api-key=************&mask=************&notmask=shouldnotbemask';
```
