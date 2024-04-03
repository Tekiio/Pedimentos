/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/**
* @name TKIO - Pedimentos actualizacion - MR
* @version 1.0
* @author Ricardo López <ricardo.lopez@freebug.mx>
* @summary Efectua los cambios sobre las transacciones que se envian
* @copyright Tekiio México 2022
* 
* Cliente       -> Cliente
* Last modification  -> 12/03/2024
* Modified by     -> Ricardo López <ricardo.lopez@freebug.mx>
* Script in NS    -> _tkio_ped_effect_change_mr <TKIO - Pedimentos actualizacion - MR>
*/
define(['N/log', 'N/url', 'N/search', 'N/record', 'N/runtime', '../Lib/constants.js', '../Lib/functions.js'],

    (log, url, search, record, runtime, constants, functions) => {
        const { RECORDS, SCRIPTS } = constants;
        const { getDataToSS, getInfoToTransaction, getInfoToTransactionIF, getInfoToTransactionIA, validateToUpdate, updatePedimento, updateHistoric } = functions;

        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (inputContext) => {
            try {
                var toProcess = runtime.getCurrentScript().getParameter({ name: SCRIPTS.MAP_REDUCE.UPDATE.PARAMETERS.TO_PROCESS });
                if (toProcess !== '') {
                    toProcess = JSON.parse(toProcess)
                }
                log.debug({ title: 'Registros por procesar:', details: toProcess });
                log.debug({ title: 'IDs de registros', details: RECORDS });

                // Obtencion de los ids a procesar
                var idsTransaction = []
                toProcess.forEach((transactionPib, index) => {
                    idsTransaction.push(transactionPib.internalid.value)
                });

                // Creacion de filtros para obtencion de las transacciones a procesar
                var type = 'transaction';
                var filter = [
                    [RECORDS.FIELDS_SHARE.INTERNAL_ID, search.Operator.ANYOF, idsTransaction]
                    , 'AND',
                    [RECORDS.FIELDS_SHARE.MAIN_LINE, search.Operator.IS, 'T']
                    , 'AND',
                    [RECORDS.FIELDS_SHARE.COGS_LINE, search.Operator.IS, 'F']
                    , 'AND',
                    [RECORDS.FIELDS_SHARE.SHIPPING_LINE, search.Operator.IS, 'F']
                ]

                var columns = [
                    search.createColumn({ name: RECORDS.FIELDS_SHARE.INTERNAL_ID }),
                    search.createColumn({ name: RECORDS.FIELDS_SHARE.STATUS }),
                    search.createColumn({ name: RECORDS.FIELDS_SHARE.TYPE }),
                    search.createColumn({ name: RECORDS.FIELDS_SHARE.RECOROD_TYPE })
                ]
                var dataTransactions = getDataToSS(type, filter, columns);
                log.debug({ title: 'dataTransactions', details: dataTransactions });
                var dataToUpdate = [];
                dataTransactions.results.forEach((transactionPib) => {
                    var arrLine = null;
                    switch (transactionPib.recordType) {
                        case record.Type.ITEM_RECEIPT:
                            arrLine = getInfoToTransaction(transactionPib.internalid.value, transactionPib.recordType);
                            break;
                        case record.Type.ITEM_FULFILLMENT:
                            arrLine = getInfoToTransactionIF(transactionPib.internalid.value, transactionPib.recordType);
                            break;
                        case record.Type.INVENTORY_ADJUSTMENT:
                            arrLine = getInfoToTransactionIA(transactionPib.internalid.value, transactionPib.recordType);
                            break;
                    }
                    log.debug({ title: 'arrLine', details: arrLine });

                    // Valida la informacion si ya fue generado o no
                    var arrToUpdate = validateToUpdate(arrLine, transactionPib.internalid.value, transactionPib.recordType);
                    log.debug({ title: 'arrToUpdate', details: arrToUpdate });
                    if (arrToUpdate.update === true) {
                        dataToUpdate = dataToUpdate.concat(arrToUpdate.arrToUpdate)
                    }
                });
                return dataToUpdate
            } catch (e) {
                log.error({ title: 'Error getInputData:', details: e });
                return [];
            }

        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        const map = (mapContext) => {
            try {

                var key = mapContext.key;
                var value = JSON.parse(mapContext.value);
                log.debug({ title: 'key', details: key });
                log.debug({ title: 'value', details: value });

                // Dependiendo de la transaccion se realizará un ingreso o consumo de la transaccion.
                var typeRecord = value.typeTransaction;
                // SWich previo para buscar datos los cuales son obtenidos de la transaccion en especifico
                switch (typeRecord) {
                    case record.Type.ITEM_FULFILLMENT:
                        if (value.hasOwnProperty('noSerie')) {
                            var invDetNum = search.lookupFields({ type: 'inventorynumber', id: value.idSerie, columns: 'inventorynumber' }).inventorynumber;
                            log.debug({ title: 'invDetNum', details: invDetNum });
                            value.noSerie = invDetNum;
                        }
                        break;
                    case record.Type.INVENTORY_ADJUSTMENT:
                        var typeMovement1 = search.lookupFields({ type: value.typeTransaction, id: value.idTransaction, columns: [RECORDS.INVENTORY_ADJUSTMENT.FIELDS.TYPE_MOVEMENT] })[RECORDS.INVENTORY_ADJUSTMENT.FIELDS.TYPE_MOVEMENT];

                        if (value.hasOwnProperty('noSerie') && typeMovement1[0].value === '2') {
                            var invDetNum = search.lookupFields({ type: 'inventorynumber', id: value.idSerie, columns: 'inventorynumber' }).inventorynumber;
                            log.debug({ title: 'invDetNum', details: invDetNum });
                            value.noSerie = invDetNum;
                        }
                        break;
                }
                // Validamos si existe un pedimento previamente generado
                var idMaster = searchMaster(value.typeTransaction, value.idTransaction, value.item.value, value.location.value, value.pedimento, (value?.noSerie || null))
                log.debug({ title: 'idMaster encontrado', details: idMaster });
                var condition = 'create';
                if ((typeof idMaster === 'object')) {
                    value.masterId = idMaster[RECORDS.HISTORIC.FIELDS.MASTER].value
                    value.historicId = idMaster.internalid.value;
                    condition = 'update';
                }
                switch (typeRecord) {
                    // Caso para ingreso de pedimentos
                    case record.Type.ITEM_RECEIPT:
                        if (idMaster !== -2) {
                            var updatedMaster = updatePedimento(value.masterId, condition, value, 'ingreso');
                            value.masterId = updatedMaster;
                            log.debug({ title: 'ID Maestro pedimento (IR):', details: updatedMaster });
                            var updatedHistoric = updateHistoric(updatedMaster, value);
                            value.historicId = updatedHistoric;
                            log.debug({ title: 'ID historial pedimento(IR):', details: updatedHistoric });
                        }
                        break;
                    // Caso para consumo de pedimentos
                    case record.Type.ITEM_FULFILLMENT:
                        log.debug({ title: 'Datos para validar', details: { value, condition } });
                        if (idMaster !== -2 && condition !== 'create') {
                            if (value.historicId !== '') {
                                value.action = 'update';
                            }
                            var updatedMaster = updatePedimento(value.masterId, condition, value, 'consumo');
                            value.masterId = updatedMaster;
                            log.debug({ title: 'ID Maestro pedimento (IF):', details: updatedMaster });
                            var updatedHistoric = updateHistoric(updatedMaster, value);
                            value.historicId = updatedHistoric;
                            log.debug({ title: 'ID historial pedimento(IF):', details: updatedHistoric });
                        }
                        break;
                    case record.Type.INVENTORY_ADJUSTMENT:
                        const typeMovement = search.lookupFields({ type: value.typeTransaction, id: value.idTransaction, columns: [RECORDS.INVENTORY_ADJUSTMENT.FIELDS.TYPE_MOVEMENT] })[RECORDS.INVENTORY_ADJUSTMENT.FIELDS.TYPE_MOVEMENT];
                        if (idMaster !== -2 && condition !== 'create' && typeMovement[0].value === '2') {

                            var updatedMaster = updatePedimento(value.masterId, condition, value, 'consumo');
                            value.masterId = updatedMaster;
                            log.debug({ title: 'ID Maestro pedimento (IA consumo):', details: updatedMaster });
                            var updatedHistoric = updateHistoric(updatedMaster, value);
                            value.historicId = updatedHistoric;
                            log.debug({ title: 'ID historial pedimento(IA consumo):', details: updatedHistoric });

                        } else if (idMaster !== -2 && typeMovement[0].value === '1') {
                            var updatedMaster = updatePedimento(value.masterId, condition, value, 'ingreso');
                            value.masterId = updatedMaster;
                            log.debug({ title: 'ID Maestro pedimento (IA ingreso):', details: updatedMaster });
                            var updatedHistoric = updateHistoric(updatedMaster, value);
                            value.historicId = updatedHistoric;
                            log.debug({ title: 'ID historial pedimento(IA ingreso):', details: updatedHistoric });
                        }
                        break;
                }
                mapContext.write({
                    key: value.idTransaction + ',' + value.typeTransaction,
                    value: value,
                })
            } catch (e) {
                log.error({ title: 'Error map:', details: e });
            }

        }
        const searchMaster = (typeTran, idTran, idItem, idLocation, noPedimento, noSerie) => {
            try {
                log.debug({ title: 'Datos para busqueda de maestro de pedimento:', details: { idTran, idItem, idLocation, noPedimento, noSerie } });
                var type = type = RECORDS.HISTORIC.id
                var filter = [
                    [RECORDS.HISTORIC.FIELDS.TRAN_RELATED, search.Operator.ANYOF, idTran]
                    , 'AND',
                    [RECORDS.HISTORIC.FIELDS.ITEM, search.Operator.ANYOF, idItem]
                    , 'AND',
                    [RECORDS.HISTORIC.FIELDS.LOCATION, search.Operator.ANYOF, idLocation]
                    , 'AND',
                    [RECORDS.HISTORIC.FIELDS.NO_PEDIMENTO, search.Operator.IS, noPedimento]
                ];
                if (noSerie !== null) filter.push('AND', [RECORDS.HISTORIC.FIELDS.SERIE_LOTE, search.Operator.IS, noSerie])
                var columns = [
                    search.createColumn({ name: RECORDS.HISTORIC.FIELDS.INTERNAL_ID }),
                    search.createColumn({ name: RECORDS.HISTORIC.FIELDS.MASTER }),
                ];
                var obtenMaster = {}

                obtenMaster = getDataToSS(type, filter, columns);
                switch (typeTran) {
                    case record.Type.ITEM_RECEIPT:
                        break;
                    case record.Type.ITEM_FULFILLMENT:
                        // obtenMaster = getDataToSS(type, filter, columns);

                        if (obtenMaster.count === 0) {
                            var typeParent = RECORDS.MASTER_PED.id;
                            var filterParent = [
                                [RECORDS.MASTER_PED.FIELDS.ITEM, search.Operator.ANYOF, idItem]
                                , 'AND',
                                [RECORDS.MASTER_PED.FIELDS.LOCATION, search.Operator.ANYOF, idLocation]
                                , 'AND',
                                [RECORDS.MASTER_PED.FIELDS.NO_PEDIMENTO, search.Operator.IS, noPedimento]
                            ];
                            if (noSerie !== null) filterParent.push('AND', [RECORDS.MASTER_PED.FIELDS.SERIE_LOTE, search.Operator.IS, noSerie])

                            var columnsParent = [
                                search.createColumn({ name: RECORDS.MASTER_PED.FIELDS.INTERNAL_ID }),
                            ];

                            var obtenMasterParent = getDataToSS(typeParent, filterParent, columnsParent);
                            if (obtenMasterParent.count > 0) {
                                obtenMaster.count = 1;
                                obtenMaster.results = [{
                                    [RECORDS.HISTORIC.FIELDS.MASTER]: obtenMasterParent.results[0][RECORDS.MASTER_PED.FIELDS.INTERNAL_ID],
                                    [RECORDS.HISTORIC.FIELDS.INTERNAL_ID]: {
                                        value: '',
                                        text: ''
                                    }
                                }
                                ];
                            }

                            log.debug({ title: 'obtenMasterParent', details: obtenMasterParent });
                        }
                        break;
                    case record.Type.INVENTORY_ADJUSTMENT:
                        const typeMovement = search.lookupFields({ type: typeTran, id: idTran, columns: [RECORDS.INVENTORY_ADJUSTMENT.FIELDS.TYPE_MOVEMENT] })[RECORDS.INVENTORY_ADJUSTMENT.FIELDS.TYPE_MOVEMENT];
                        log.debug({ title: 'typeMovement', details: typeMovement });
                        if (typeMovement.length > 0) {
                            switch (typeMovement[0].value) {
                                case '1':
                                    break;
                                case '2':
                                    if (obtenMaster.count === 0) {
                                        var typeParent = RECORDS.MASTER_PED.id;
                                        var filterParent = [
                                            [RECORDS.MASTER_PED.FIELDS.ITEM, search.Operator.ANYOF, idItem]
                                            , 'AND',
                                            [RECORDS.MASTER_PED.FIELDS.LOCATION, search.Operator.ANYOF, idLocation]
                                            , 'AND',
                                            [RECORDS.MASTER_PED.FIELDS.NO_PEDIMENTO, search.Operator.IS, noPedimento]
                                        ];
                                        if (noSerie !== null) filterParent.push('AND', [RECORDS.MASTER_PED.FIELDS.SERIE_LOTE, search.Operator.IS, noSerie])

                                        var columnsParent = [
                                            search.createColumn({ name: RECORDS.MASTER_PED.FIELDS.INTERNAL_ID }),
                                        ];

                                        var obtenMasterParent = getDataToSS(typeParent, filterParent, columnsParent);
                                        if (obtenMasterParent.count > 0) {
                                            obtenMaster.count = 1;
                                            obtenMaster.results = [{
                                                [RECORDS.HISTORIC.FIELDS.MASTER]: obtenMasterParent.results[0][RECORDS.MASTER_PED.FIELDS.INTERNAL_ID],
                                                [RECORDS.HISTORIC.FIELDS.INTERNAL_ID]: {
                                                    value: '',
                                                    text: ''
                                                }
                                            }
                                            ];
                                        }

                                        log.debug({ title: 'obtenMasterParent', details: obtenMasterParent });
                                    }
                                    break;

                            }
                        }
                        break;
                }
                log.debug({ title: 'obtenMaster', details: obtenMaster });
                return (obtenMaster.details === '' ? ((obtenMaster.count === 1) ? obtenMaster.results[0] : -1) : -2)
            } catch (e) {
                log.error({ title: 'Error searchMaster:', details: e });
                return -2
            }
        }

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (reduceContext) => {
            try {
                log.debug({ title: 'reduceContext', details: reduceContext });
                var key = reduceContext.key;
                log.debug({ title: 'key', details: key });
                log.debug({ title: 'typeof key', details: typeof key });
                var dataGeneral = key.split(',')
                // var value = JSON.parse(reduceContext.values);
                // record.submitFields({
                //     type: dataGeneral[1],
                //     id: dataGeneral[0],
                //     values: {
                //         custbody_tkio_status_process_ped: 4,
                //         custbody_tkio_taskid_pedimento_process: ''
                //     }
                // })
            } catch (e) {
                log.error({ title: 'Error reduce:', details: e });
            }
        }


        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {

        }

        return { getInputData, map, reduce, summarize }

    });
