import * as gcp from "@pulumi/gcp";
import { gcpProvider } from "../config/provider";
import { Config } from "@pulumi/pulumi";

const stackConfig = new Config();
const NODE_SERVER_PORT = stackConfig.requireNumber("nodeServerPort");

export function createLoadBalancer(name: string, instanceGroup: gcp.compute.RegionInstanceGroupManager) {
    // Create a global static IP address for the load balancer
    const globalAddress = new gcp.compute.GlobalAddress(`${name}-address`, {}, { provider: gcpProvider });

    // Define a health check for the instances on port
    const healthCheck = new gcp.compute.HttpHealthCheck(`${name}-health-check`, {
        requestPath: "/v1/healthcheck",  // Replace with the actual health check path of your Node.js server
        port: NODE_SERVER_PORT as any,  // Ensure the health check uses port
    }, { provider: gcpProvider });

    // Define the backend service using the instance group
    const backendService = new gcp.compute.BackendService(`${name}-backend-service`, {
        backends: [{
            group: instanceGroup.instanceGroup,
        }],
        healthChecks: healthCheck.id,
        loadBalancingScheme: "EXTERNAL",
        protocol: "HTTP",
        portName: `http-${NODE_SERVER_PORT}`,  // This name must match the name in the InstanceGroup
    }, { provider: gcpProvider });

    // Create a URL map to route incoming requests to the backend service
    const urlMap = new gcp.compute.URLMap(`${name}-url-map`, {
        defaultService: backendService.id,
    }, { provider: gcpProvider });

    // Create an HTTP proxy to forward requests to the URL map
    const httpProxy = new gcp.compute.TargetHttpProxy(`${name}-http-proxy`, {
        urlMap: urlMap.id,
    }, { provider: gcpProvider });

    // Create a global forwarding rule to route traffic to the HTTP proxy
    const forwardingRule = new gcp.compute.GlobalForwardingRule(`${name}-forwarding-rule`, {
        ipAddress: globalAddress.address,
        ipProtocol: "TCP",
        portRange: "80",
        target: httpProxy.id,
    }, { provider: gcpProvider });

    return {
        globalAddress,
        healthCheck,
        backendService,
        urlMap,
        httpProxy,
        forwardingRule,
        loadBalancerIp: globalAddress.address,
    };
}
