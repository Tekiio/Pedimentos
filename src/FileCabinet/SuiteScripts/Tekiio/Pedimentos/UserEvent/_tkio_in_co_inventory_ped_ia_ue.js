/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
/**
* @name TKIO - Input/Output pedimentos IA - UE
* @version 1.0
* @author Ricardo López <ricardo.lopez@freebug.mx>
* @summary Script que captura todas las entradas/salidas de inventario, considerando el pedimento por generar/consumir
* @copyright Tekiio México 2022
* 
* Cliente       -> Cliente
* Last modification  -> 12/03/2024
* Modified by     -> Ricardo López <ricardo.lopez@freebug.mx>
* Script in NS    -> TKIO - Input/Output pedimentos IA - UE <_tkio_in_co_invent_ped_ia_ue>
*/
define(['N/log', 'N/url', 'N/search', 'N/record', 'N/ui/serverWidget', 'N/ui/message', '../Lib/constants.js', '../Lib/functions.js'],

    (log, url, search, record, serverWidget, message, constants, functions) => {
        const { RECORDS } = constants;
        const { getInfoToTransactionIA, validateToUpdate } = functions;
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
                        var procesar = Number(record_now.getValue({ fieldId: RECORDS.INVENTORY_ADJUSTMENT.FIELDS.STATUS }));
                        switch (procesar) {
                            case 2:
                                form.addPageInitMessage({ type: message.Type.INFORMATION, message: 'La recepcion esta pendiente a procesar la entrada de pedimentos' }); break;
                                break;
                            case 3:
                                form.addPageInitMessage({ type: message.Type.INFORMATION, message: 'La recepcion esta siendo procesada la entrada de pedimentos' }); break;
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
                        const arrLine = getInfoToTransactionIA(newRecord.id, newRecord.type);
                        log.debug({ title: 'arrLine', details: arrLine });

                        // Valida la informacion si ya fue generado o no
                        const arrToUpdate = validateToUpdate(arrLine, newRecord.id, newRecord.type);
                        log.debug({ title: 'arrToUpdate', details: arrToUpdate });
                        var procesar = Number(newRecord.getValue({ fieldId: RECORDS.INVENTORY_ADJUSTMENT.FIELDS.STATUS }));
                        if (arrToUpdate.update === true && procesar === 1) {
                            var typeMovement = newRecord.getValue({ fieldId: RECORDS.INVENTORY_ADJUSTMENT.FIELDS.TYPE_MOVEMENT })
                            // if (type === scriptContext.UserEventType.CREATE) {
                            if (typeMovement === '1') {
                                setNoPedimento(newRecord.type, newRecord.id);
                            }
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
                const LINE_COUNT = record_now.getLineCount({ sublistId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.id });

                var noPedimentoBody = record_now.getValue({ fieldId: RECORDS.INVENTORY_ADJUSTMENT.FIELDS.NO_PEDIMENTO });
                log.debug({ title: 'noPedimentoBody', details: noPedimentoBody });
                log.debug({title: 'LINE_COUNT', details: LINE_COUNT});
                for (var i = 0; i < LINE_COUNT; i++) {
                    var containPed = record_now.getSublistValue({ sublistId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.id, fieldId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.FIELDS.CONTAIN_PEDIMENTO, line: i }) || false;
                    if (containPed) {
                        record_now.selectLine({ sublistId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.id, line: i })
                        record_now.setCurrentSublistValue({ sublistId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.id, fieldId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.FIELDS.NO_PEDIMENTO, value: noPedimentoBody });
                        record_now.commitLine({ sublistId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.id, ignoreRecalc: true })
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
