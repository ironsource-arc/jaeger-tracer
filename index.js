const jaegerClient = require("jaeger-client");
const prometheusClient = require('prom-client');
const opentracing = require('opentracing');
const path = require('path');
const config = require('config');
const { extendDeep, loadFileConfigs } = config.util;
const ourConfigDir = path.join(__dirname, 'config');
const defaultConfig = loadFileConfigs(ourConfigDir);
const { initTracer: initJaegerTracer, initTracerFromEnv, PrometheusMetricsFactory } = jaegerClient;

const { initGlobalTracer, Tags } = opentracing;

class MetricsFactory {
    constructor(serviceName, options) {
        options = options || {};
        this.namespace = this.sanitizeName(serviceName);
        this.factory = options.factory || new PrometheusMetricsFactory(prometheusClient, this.namespace);
    }

    sanitizeName(name) {
        return name.replace(/[-:]/g, '_');
    }

    createCounter(name, tags) {
        name = this.sanitizeName(name)
        return this.factory.createCounter(name, tags);
    }

    createGauge(name, tags) {
        name = this.sanitizeName(name)
        return this.factory.createGauge(name, tags);
    }

    createTimer(name, tags) {
        name = this.sanitizeName(name)
        return this.factory.createTimer(name, tags);
    }
}

class Logger {
    info(msg){
        console.info(msg);
    }
    error(msg){
        console.error(msg);
    };
}

const initGlboalTracer = (config, logger, metrics) => {
    config = extendDeep(defaultConfig.config, config);
    const options = {
        metrics: metrics || new MetricsFactory(config.serviceName),
        logger: logger || new Logger()
    };
    const tracer = initTracerFromEnv(config, options);
    initGlobalTracer(tracer);
    return tracer;
};
 
const logError = (span, errorObject, message, stack, markTraced = true) => {
    if ((!span) || (!span.setTag instanceof Function)) return;
    if (!span.log instanceof Function) return;
    if(errorObject.traced) return;         
    if(!span._tags.find(t => t.key === 'error')) {
        span.setTag(Tags.ERROR, true);
    }
    //always sample on error.    
    if(!span._tags.find(t => t.key === 'sampling')) {
        span.setTag(Tags.SAMPLING_PRIORITY, 1);
    }
    span.log({ 'event': 'error', 'error.object': errorObject, 'message': message || errorObject.message, 'stack': stack || errorObject.stack });
    errorObject.traced = markTraced;
}

const tagWarning = (span, msg) => {
    span.setTag('warning', msg);
}

module.exports = {
    initGlboalTracer,
    opentracing,
    prometheusClient,
    jaegerClient,
    logError,
    tagWarning
};
