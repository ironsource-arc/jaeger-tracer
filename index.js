const jaegerClient = require("jaeger-client");
const prometheusClient = require('prom-client');
const opentracing = require('opentracing');
 
const { initTracer: initJaegerTracer, PrometheusMetricsFactory } = jaegerClient;
const { initGlobalTracer } = opentracing;

class MetricsFactory {
    constructor(serviceName, options) {
        options = options || {}
        this.namespace = this.sanitizeName(serviceName)
        this.factory = options.factory || new PrometheusMetricsFactory(prometheusClient, this.namespace)
    }

    sanitizeName(name) {
        return name.replace(/[-:]/g, '_')
    }

    createCounter(name, tags) {
        name = this.sanitizeName(name)
        return this.factory.createCounter(name, tags)
    }

    createGauge(name, tags) {
        name = this.sanitizeName(name)
        return this.factory.createGauge(name, tags)
    }

    createTimer(name, tags) {
        name = this.sanitizeName(name)
        return this.factory.createTimer(name, tags)
    }
}

const initGlboalTracer = (config, options) => {

    let tracer = null;

    // See schema https://github.com/jaegertracing/jaeger-client-node/blob/master/src/configuration.js#L37
    const jaegerConfig = {
        serviceName: serviceName,
        sampler: {
            type: "const",
            param: 1,
        },
        reporter: {
            // Provide the traces endpoint; this forces the client to connect directly to the Collector and send
            // spans over HTTP
            //collectorEndpoint: config.jaeger.collectorEndpoint,
            logSpans: true,
        },
    }; 

    try {
        config = Object.assign(jaegerConfig, config);

        const jaegerOptions = {
            metrics: new MetricsFactory(jaegerConfig.serviceName),
            logger: logger,
        };

        options = Object.assign(jaegerOptions, options);
  
        tracer  = initJaegerTracer(config, options);
        
        initGlobalTracer(tracer);
        return tracer;

    }
    catch (error) {
        console.error(error);
    }
    
    return tracer;
};


module.exports = {
    initGlboalTracer,
    opentracing,
    prometheusClient,
    jaegerClient
};
