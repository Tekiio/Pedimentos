/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
/**
* @name TKIO - Consume pedimento IF - UE
* @version 1.0
* @author Ricardo López <ricardo.lopez@freebug.mx>
* @summary Script que realiza el consumo del pedimento
* @copyright Tekiio México 2022
* 
* Producto       -> Producto
* Last modification  -> 26/03/2024
* Modified by     -> Ricardo López <ricardo.lopez@freebug.mx>
* Script in NS    -> TKIO - Consume pedimento IF - UE <_tkio_consu_inventory_ped_ue>
*/
define(['N/log', 'N/record', '../Lib/constants.js', '../Lib/functions.js'],
    (log, record, constants, functions) => {
        const { RECORDS } = constants;
        const { getInfoToTransactionIF, validateToUpdate } = functions;
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
                        const arrLine = getInfoToTransactionIF(newRecord.id, newRecord.type);
                        log.debug({ title: 'arrLine', details: arrLine });

                        // Valida la informacion si ya fue generado o no
                        const arrToUpdate = validateToUpdate(arrLine, newRecord.id, newRecord.type);
                        log.debug({ title: 'arrToUpdate', details: arrToUpdate });
                        var procesar = Number(newRecord.getValue({ fieldId: RECORDS.ITEM_RECEIPT.FIELDS.STATUS }));
                        if (arrToUpdate.update === true && procesar === 1) {
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

        return { beforeLoad, beforeSubmit, afterSubmit }

    });
