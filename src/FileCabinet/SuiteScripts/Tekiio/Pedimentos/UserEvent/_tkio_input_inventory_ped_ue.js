/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
/**
* @name TKIO - Entrada de pedimentos al inventario - UE
* @version 1.0
* @author Ricardo López <ricardo.lopez@freebug.mx>
* @summary Script que captura todas las entradas de inventario, considerando el pedimento por generar
* @copyright Tekiio México 2022
* 
* Cliente       -> Cliente
* Last modification  -> 12/03/2024
* Modified by     -> Ricardo López <ricardo.lopez@freebug.mx>
* Script in NS    -> TKIO - Entrada de pedimenetos al inventario - UE <_tkio_input_inventory_ped_ue>
*/
define(['N/log', 'N/url', 'N/search', 'N/record', 'N/ui/serverWidget', 'N/ui/message', '../Lib/constants.js', '../Lib/functions.js'],

    (log, url, search, record, serverWidget, message, constants, functions) => {
        const { RECORDS } = constants;
        const { getInfoToTransaction, validateToUpdate } = functions;
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            try {
                var contextType = scriptContext.type;
                log.debug({ title: 'IDs de registros:', details: RECORDS });

                switch (contextType) {
                    case scriptContext.UserEventType.VIEW:
                        var form = scriptContext.form;
                        var record_now = scriptContext.newRecord;
                        var procesar = Number(record_now.getValue({ fieldId: RECORDS.ITEM_RECEIPT.FIELDS.STATUS }));
                        switch (procesar) {
                            case 2:
                                form.addPageInitMessage({ type: message.Type.INFORMATION, message: 'La recepcion esta pendiente a procesar la entrada de pedimentos' }); break;
                                break;
                            case 3:
                                form.addPageInitMessage({ type: message.Type.INFORMATION, message: 'La recepcion esta siedo procesada la entrada de pedimentos' }); break;
                                break;
                        }
                }
            } catch (e) {
                log.error({ title: 'Error beforeLoad:', details: e });
            }
        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
        }
        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            try {
                const { type, newRecord } = scriptContext;
                log.debug({ title: 'IDs de registros:', details: RECORDS });
                switch (type) {
                    case scriptContext.UserEventType.CREATE:
                    case scriptContext.UserEventType.EDIT:
                        // Obtiene las lineas del registro actual
                        const arrLine = getInfoToTransaction(newRecord.id, newRecord.type);
                        log.debug({ title: 'arrLine', details: arrLine });

                        // Valida la informacion si ya fue generado o no
                        const arrToUpdate = validateToUpdate(arrLine, newRecord.id, newRecord.type);
                        log.debug({ title: 'arrToUpdate', details: arrToUpdate });
                        var procesar = Number(newRecord.getValue({ fieldId: RECORDS.ITEM_RECEIPT.FIELDS.STATUS }));
                        if (arrToUpdate.update === true && procesar === 1) {
                            // if (type === scriptContext.UserEventType.CREATE) {
                                setNoPedimento(newRecord.type, newRecord.id);
                            // }
                            // Actualizamos para que el script MapReduce realice las siguientes funciones:
                            // 1. Genere/edite los maestros de pedimentos
                            // 2. Genere/edite los historiales
                            record.submitFields({
                                type: newRecord.type,
                                id: newRecord.id,
                                values: {
                                    custbody_tkio_status_process_ped: 2,
                                    custbody_tkio_taskid_pedimento_process: ''
                                }
                            })
                        } else {

                        }
                        break;
                }
            } catch (e) {
                log.error({ title: 'Error afterSubmit:', details: e });
            }
        }
        // Establece a nivel linea el valor del numero de pedimento
        const setNoPedimento = (typeRd, idRd) => {
            try {
                var record_now = record.load({ type: typeRd, id: idRd, isDynamic: true, });
                const LINE_COUNT = record_now.getLineCount({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id });
                // log.audit({ title: 'Numero de lineas', details: LINE_COUNT });
                // Si proviene de un Inboun Shipment obtiene su id y su numero de pedimento
                var idInbShip = record_now.getValue({ fieldId: RECORDS.ITEM_RECEIPT.FIELDS.INBOUND_SHIPMENT });
                // log.debug({ title: 'idInbShip', details: idInbShip });
                var noPedimento = '';
                if (idInbShip) {
                    let columnaSearch = [RECORDS.INBOUND_SHIPMENT.FIELDS.NO_PEDIMENTO];
                    noPedimento = search.lookupFields({ type: RECORDS.INBOUND_SHIPMENT.id, id: idInbShip, columns: columnaSearch })[RECORDS.INBOUND_SHIPMENT.FIELDS.NO_PEDIMENTO];
                    record_now.setValue({ fieldId: RECORDS.ITEM_RECEIPT.FIELDS.NO_PEDIMENTO, value: noPedimento });
                } else {
                    noPedimento = record_now.getValue({ fieldId: RECORDS.ITEM_RECEIPT.FIELDS.NO_PEDIMENTO });
                }
                for (var i = 0; i < LINE_COUNT; i++) {
                    var containPed = record_now.getSublistValue({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.CONTAIN_PEDIMENTO, line: i }) || false;
                    if (containPed) {
                        record_now.selectLine({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, line: i })
                        record_now.setCurrentSublistValue({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.NO_PEDIMENTO, value: noPedimento });
                        record_now.commitLine({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, ignoreRecalc: true })
                    }
                }
                record_now.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                })
            } catch (e) {
                log.error({ title: 'Error :', details: e });
            }
        }
        return {
            beforeLoad: beforeLoad,
            // beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        }

    });
