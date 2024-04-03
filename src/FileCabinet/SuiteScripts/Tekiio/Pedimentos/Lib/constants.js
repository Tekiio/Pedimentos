/**
 * @NApiVersion 2.1
 */
define(['N/log', 'N/search', 'N/record'],
    (log, search, record) => {
        const RECORDS = {};
        RECORDS.MASTER_PED = {
            id: 'customrecord_efx_ped_master_record',
            FIELDS: {
                INTERNAL_ID: 'internalid',
                NO_PEDIMENTO: 'custrecord_efx_ped_number',
                DATE: 'custrecord_efx_ped_date',
                ITEM: 'custrecord_exf_ped_item',
                QUANTITY_AVAILABLE: 'custrecord_efx_ped_available',
                TYPE_CHANGE: 'custrecord_efx_ped_exchange',
                COST: 'custrecord_efx_ped_price',
                ETA: 'custrecord_efx_ped_eta',
                ETD: 'custrecord_efx_ped_etd',
                TOTAL_COST: 'custrecord_efx_ped_total',
                SERIE_LOTE: 'custrecord_efx_ped_serial_lote',
                LOCATION: 'custrecord_exf_ped_location'
            }
        }
        RECORDS.HISTORIC = {
            id: 'customrecord_efx_ped_record_history',
            FIELDS: {
                INTERNAL_ID: 'internalid',
                MASTER: 'custrecord_efx_ped_h_pedimento',
                TRAN_RELATED: 'custrecord_efx_ped_related_tran',
                ITEM: 'custrecord_efx_ped_h_item',
                QUANTITY: 'custrecord_efx_ped_h_quantity',
                VALUE_PREV: 'custrecord_efx_ped_h_oldvalue',
                VALUE_NEW: 'custrecord_efx_ped_newvalue',
                NO_PEDIMENTO: 'custrecord_efx_ped_numpedimento',
                SERIE_LOTE: 'custrecord_efx_ped_historial_serial_lote',
                LOCATION: 'custrecord_efx_ped_h_location'
            }
        }
        RECORDS.ITEM_RECEIPT = {
            id: 'itemreceipt',
            FIELDS: {
                INTERNAL_ID: 'internalid',
                STATUS: 'custbody_tkio_status_process_ped',
                NO_PEDIMENTO: 'custbody_efx_ped_no_pedimento_oc',
                INBOUND_SHIPMENT: 'inboundshipmentvalue'
            },
            SUBLIST: {
                id: 'item',
                FIELDS: {
                    ITEM: 'item',
                    ITEM_NAME: 'itemname',
                    LOCATION: 'location',

                    TYPE: 'itemtype',
                    QUANTITY: 'quantity',
                    RATE: 'rate',

                    INVENTORY_DETAIL: 'inventorydetail',
                    CONTAIN_INVENTORY_DETAIL: 'inventorydetailavail',

                    NO_PEDIMENTO: 'custcol_efx_ped_numero_pedimento',
                    CONTAIN_PEDIMENTO: 'custcol_efx_ped_contains',
                }
            },
        }
        RECORDS.SALES_ORDER = {
            id: 'salesorder',
            FIELDS: {
                INTERNAL_ID: 'internalid',
            },
            SUBLIST: {
                id: 'item',
                FIELDS: {
                    ITEM: 'item',
                    ITEM_NAME: 'item_display',
                    LOCATION: 'location',
                    LOCATION_NAME: 'location_display',

                    TYPE: 'itemtype',
                    QUANTITY: 'quantity',
                    RATE: 'rate',

                    INVENTORY_DETAIL: 'inventorydetail',
                    CONTAIN_INVENTORY_DETAIL: 'inventorydetailavail',

                    NO_PEDIMENTO: 'custcol_efx_ped_numero_pedimento',
                    CONTAIN_PEDIMENTO: 'custcol_efx_ped_contains',
                }
            },
        }
        RECORDS.INVENTORY_ADJUSTMENT = {
            id: 'inventoryadjustment',
            FIELDS: {
                INTERNAL_ID: 'internalid',
                STATUS: 'custbody_tkio_status_process_ped',
                TYPE_MOVEMENT: 'custbody_efx_ped_type_movement',
                NO_PEDIMENTO: 'custbody_efx_ped_no_pedimento_oc',
            },
            SUBLIST: {
                id: 'inventory',
                FIELDS: {
                    ITEM: 'item',
                    ITEM_NAME: 'item_display',
                    LOCATION: 'location',
                    LOCATION_NAME: 'location_display',

                    TYPE: 'itemtype',
                    QUANTITY: 'adjustqtyby',
                    RATE: 'rate',

                    INVENTORY_DETAIL: 'inventorydetail',
                    CONTAIN_INVENTORY_DETAIL: 'inventorydetailavail',

                    NO_PEDIMENTO: 'custcol_efx_ped_numero_pedimento',
                    CONTAIN_PEDIMENTO: 'custcol_efx_ped_contains',
                }
            },
        }
        RECORDS.ITEM_FULFILLMENT = {
            id: 'itemfulfillment',
            FIELDS: {
                INTERNAL_ID: 'internalid',
                STATUS: 'custbody_tkio_status_process_ped'
            },
            SUBLIST: {
                id: 'item',
                FIELDS: {
                    ITEM: 'item',
                    ITEM_NAME: 'itemname',
                    LOCATION: 'location',

                    TYPE: 'itemtype',
                    QUANTITY: 'quantity',
                    RATE: 'rate',

                    INVENTORY_DETAIL: 'inventorydetail',
                    CONTAIN_INVENTORY_DETAIL: 'inventorydetailavail',

                    NO_PEDIMENTO: 'custcol_efx_ped_numero_pedimento',
                    CONTAIN_PEDIMENTO: 'custcol_efx_ped_contains',
                }
            },
        }
        RECORDS.INVENTORY_DETAIL = {
            id: 'inventorydetail',
            FIELDS: {

            },
            SUBLIST: {
                id: 'inventoryassignment',
                FIELDS: {
                    INVENTORY_NUMBER: 'receiptinventorynumber',
                    QUANTITY: 'quantity',
                }
            }
        }
        RECORDS.INBOUND_SHIPMENT = {
            id: 'inboundshipment',
            FIELDS: {
                internalid: 'internalid',
                NO_PEDIMENTO: 'custrecord_efx_ped_inb_pedimento'
            }
        }

        RECORDS.FIELDS_SHARE = {
            idTransaction: 'transaction',
            INTERNAL_ID: 'internalid',
            MAIN_LINE: 'mainline',
            COGS_LINE: 'cogs',
            SHIPPING_LINE: 'shipping',
            STATUS: 'custbody_tkio_status_process_ped',
            TYPE: 'type',
            RECOROD_TYPE: 'recordType',
            SUBLIST: {
                ITEM: 'item',
                NO_PEDIMENTO: 'custcol_efx_ped_numero_pedimento',
                CONTAIN_PEDIMENTO: 'custcol_efx_ped_contains',
                LINE: 'line',
            }
        }

        const SCRIPTS = {};
        SCRIPTS.MAP_REDUCE = {
            ID: 'scriptdeployment',
            FIELDS: {
                SCRIPT_ID: 'scriptid',
                IS_DEPLOY: 'isdeployed',
                QUEUE_ID: 'queueid'
            },
            TRIGGER: {
                SCRIPT_ID: 'customscript_tkio_ped_trigger_update_mr',
                DEPLOY_ID: 'customdeploy_tkio_ped_trigger_update_mr0',
                PARAMETERS: {
                    STATUS: 'custscript_tkio_ped_status_pending_to_pr'
                }
            },
            UPDATE: {
                SCRIPT_ID: 'customscript_tkio_ped_effect_change_mr',
                DEPLOY_ID: 'customdeploy_tkio_ped_effect_change_mr',
                PARAMETERS: {
                    TO_PROCESS: 'custscript_tkio_ped_record_to_process'
                }
            },
        };
        return { RECORDS, SCRIPTS }
    });