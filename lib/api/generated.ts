export interface paths {
    "/api/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * API health check
         * @description Check if the API is running
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description API is healthy */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["HealthCheck"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/parts/{uuid}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get a part by UUID
         * @description Retrieve a specific part using its UUID
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    uuid: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description The requested part */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Part"];
                    };
                };
                /** @description Part not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PartNotFoundError"];
                    };
                };
                /** @description Internal server error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["InternalError"];
                    };
                };
            };
        };
        /**
         * Update a part
         * @description Update a specific part by UUID
         */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    uuid: string;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["UpdatePartBody"];
                };
            };
            responses: {
                /** @description The updated part */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Part"];
                    };
                };
                /** @description Invalid status change */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["InvalidStatusChangeError"];
                    };
                };
                /** @description Part not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PartNotFoundError"];
                    };
                };
                /** @description Internal server error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["InternalError"];
                    };
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/configs/children": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get child configurations
         * @description Get child configurations for a parent UUID (or root configs if parentUuid is null)
         */
        get: {
            parameters: {
                query?: {
                    parentUuid?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Child configurations */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ChildConfigurations"];
                    };
                };
                /** @description Configuration not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ConfigurationNotFoundError"];
                    };
                };
                /** @description Internal server error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["InternalError"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/parts/{uuid}/allowable-statuses": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get allowable statuses for a part
         * @description Get allowable statuses for a specific part based on its relationships
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    uuid: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Allowable statuses for the part */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AllowableStatuses"];
                    };
                };
                /** @description Part not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PartNotFoundError"];
                    };
                };
                /** @description Internal server error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["InternalError"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        HealthCheck: {
            /**
             * @example ok
             * @enum {string}
             */
            status: "ok";
            /**
             * @example API is running
             * @enum {string}
             */
            message: "API is running";
        };
        Part: {
            /**
             * Format: uuid
             * @example 123e4567-e89b-12d3-a456-426614174000
             */
            uuid: string;
            /** @example TM-1010 */
            partNo: string;
            /** @example Engine Part */
            name: string;
            /**
             * @example active
             * @enum {string}
             */
            status: "configuration" | "active" | "draft" | "deprecated" | "obsolete" | "experimental" | "retired" | "recalled";
            /** @example kg */
            unit: string;
        };
        PartNotFoundError: {
            /**
             * @example Part not found
             * @enum {string}
             */
            error: "Part not found";
        };
        InternalError: {
            /** @example Failed to fetch part */
            error: string;
        };
        ChildConfigurations: {
            /**
             * Format: uuid
             * @example 123e4567-e89b-12d3-a456-426614174004
             */
            uuid: string;
            /**
             * Format: uuid
             * @example 123e4567-e89b-12d3-a456-426614174005
             */
            partUuid: string;
            /** @example 4 */
            quantity: number;
            /** @example SN67890 */
            endUnitSerialNo?: string | null;
        }[];
        ConfigurationNotFoundError: {
            /**
             * @example Configuration not found
             * @enum {string}
             */
            error: "Configuration not found";
        };
        AllowableStatuses: {
            /**
             * Format: uuid
             * @example 123e4567-e89b-12d3-a456-426614174000
             */
            partUuid: string;
            /**
             * @example active
             * @enum {string}
             */
            currentStatus: "configuration" | "active" | "draft" | "deprecated" | "obsolete" | "experimental" | "retired" | "recalled";
            /**
             * @example [
             *       "active",
             *       "deprecated"
             *     ]
             */
            allowableStatuses: ("configuration" | "active" | "draft" | "deprecated" | "obsolete" | "experimental" | "retired" | "recalled")[];
        };
        InvalidStatusChangeError: {
            /**
             * @example Invalid status change
             * @enum {string}
             */
            error: "Invalid status change";
            /**
             * @example [
             *       "active",
             *       "deprecated"
             *     ]
             */
            allowableStatuses: ("configuration" | "active" | "draft" | "deprecated" | "obsolete" | "experimental" | "retired" | "recalled")[];
        };
        UpdatePartBody: {
            /** @example lbs */
            unit?: string;
            /**
             * @example active
             * @enum {string}
             */
            status?: "configuration" | "active" | "draft" | "deprecated" | "obsolete" | "experimental" | "retired" | "recalled";
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
