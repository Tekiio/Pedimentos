/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/**
* @name TKIO - Pedimentos actualizacion automatico - MR
* @version 1.0
* @author Ricardo López <ricardo.lopez@freebug.mx>
* @summary Efectua los cambios sobre las transacciones que se envian
* @copyright Tekiio México 2022
* 
* Cliente       -> Cliente
* Last modification  -> 12/03/2024
* Modified by     -> Ricardo López <ricardo.lopez@freebug.mx>
* Script in NS    -> _tkio_ped_Trigger_effect_change_mr <TKIO - Pedimentos actualizacion - MR>
*/
define(['N/log', 'N/url', 'N/search', 'N/record', 'N/runtime', 'N/task', '../Lib/constants.js', '../Lib/functions.js'],

    (log, url, search, record, runtime, task, constants, functions) => {
        const { RECORDS, SCRIPTS } = constants;
        const { getDataToSS, getInfoToTransaction, validateToUpdate, bloques } = functions;

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
                // Se obtiene el estado pendiente por procesar
                var estatus = runtime.getCurrentScript().getParameter({ name: SCRIPTS.MAP_REDUCE.TRIGGER.PARAMETERS.STATUS });
                log.debug({ title: 'SCRIPTS', details: SCRIPTS });
                log.debug({ title: 'estatus', details: estatus });
                log.debug({ title: 'IDs de registros', details: RECORDS });

                //Generacion de los filtros y columnas para obtener las transacciones no procesadas.
                var type = 'transaction';
                var filter = [
                    [RECORDS.FIELDS_SHARE.STATUS, search.Operator.ANYOF, estatus], 'AND',
                    [RECORDS.FIELDS_SHARE.MAIN_LINE, search.Operator.IS, 'T']
                ]
                var columns = [
                    search.createColumn({ name: RECORDS.FIELDS_SHARE.TYPE }),
                    search.createColumn({ name: RECORDS.FIELDS_SHARE.RECOROD_TYPE }),
                    search.createColumn({ name: RECORDS.FIELDS_SHARE.STATUS }),
                    search.createColumn({ name: RECORDS.FIELDS_SHARE.INTERNAL_ID }),
                ]

                // Se obtienen las transacciones pendientes por procesar
                var dataUpdate = getDataToSS(type, filter, columns);
                log.debug({ title: 'Datos transacciones:', details: dataUpdate });

                // Se buscan los scripts libres para su ejecución
                var typeScript = SCRIPTS.MAP_REDUCE.ID;
                var filterScript = [[SCRIPTS.MAP_REDUCE.FIELDS.SCRIPT_ID, search.Operator.CONTAINS, SCRIPTS.MAP_REDUCE.UPDATE.DEPLOY_ID]]
                var columnsScript = []
                Object.keys(SCRIPTS.MAP_REDUCE.FIELDS).forEach((fieldPib) => {
                    columnsScript.push(search.createColumn({ name: SCRIPTS.MAP_REDUCE.FIELDS[fieldPib] }));
                })
                log.debug({ title: 'columnsScript', details: columnsScript });
                var dataScripts = getDataToSS(typeScript, filterScript, columnsScript);
                log.debug({ title: 'Datos scripts:', details: dataScripts });
                dataScripts.results = dataScripts.results.filter(scriptPib => scriptPib.queueid === '');
                log.debug({ title: 'dataScripts', details: dataScripts });
                if (dataScripts.results.length > 0) {
                    var arrToProcess = [];
                    var arrBloques = bloques(dataUpdate.results, 100);
                    log.debug({ title: 'arrBloques', details: arrBloques });
                    for (var index = 0; index < arrBloques.length; index++) {
                        // En caso de llegar al final de los despliegues las demas transacciones no se procesaran
                        if (dataScripts.results.length === index) {
                            log.audit({ title: 'No se encontraron mas despliegues para realizar la ejecucion', details: 'Por motivos de procesamiento no se encontraron mas despliegues para realizar el procesamiento de la entrada de pedimentos.' });
                            break;
                        }
                        arrToProcess.push({ dataScript: dataScripts.results[index], dataToProcess: arrBloques[index] })
                    }
                    return arrToProcess;
                } else {
                    return []
                }
            } catch (e) {
                log.error({ title: 'Error getInputData:', details: e });
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
                log.debug({ title: 'SCRIPTS', details: SCRIPTS });
                var value = JSON.parse(mapContext.value);
                var key = mapContext.key;
                log.debug({ title: 'key', details: key });
                log.debug({ title: 'value', details: value });
                log.debug({ title: 'value', details: typeof value });
                const params = {
                    [SCRIPTS.MAP_REDUCE.UPDATE.PARAMETERS.TO_PROCESS]: JSON.stringify(value.dataToProcess)
                }
                var mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: SCRIPTS.MAP_REDUCE.UPDATE.SCRIPT_ID,
                    deploymentId: value.dataScript.scriptid.toLowerCase(),
                    params: params
                });
                var idTask = mrTask.submit();

                log.debug({ title: 'idTask', details: idTask });
                // value.dataToProcess.forEach((transactionPib) => {
                //     record.submitFields({
                //         type: transactionPib.recordType,
                //         id: transactionPib.internalid.value,
                //         values: {
                //             custbody_tkio_status_process_ped: 3,
                //             custbody_tkio_taskid_pedimento_process: idTask
                //         }
                //     })
                // })
            } catch (e) {
                log.error({ title: 'Error Map:', details: e });
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
