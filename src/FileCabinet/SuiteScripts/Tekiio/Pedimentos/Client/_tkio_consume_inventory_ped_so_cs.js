/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * @file Evita que el usuario guarde un record de tipo Invoice, Vendor Credit o Inventory adjustment con un numero
 * mayor al stock disponible de pedimentos
 */
define(['N/search', 'N/record', 'N/ui/message', '../Lib/constants.js', '../Lib/functions.js'],
    /**
     * @param{search} search
     */
    function (search, record, message, constants, functions) {

        const { RECORDS, SCRIPTS } = constants;
        const { getDataToSS, getInfoToTransaction, getDataLine, validateToUpdate, updatePedimento, updateHistoric, createMessage} = functions;

        function pageInit(scriptContext) {
            console.log('Iniciando las validaciones')
        }
        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        function saveRecord(scriptContext) {
            var objMsg = new Object();
            try {
                return true;
            } catch (e) {
                console.error({ title: 'Error saveRecord', details: e });
                objMsg.status = 'ERROR'
                objMsg.mesage = e
                createMessage(objMsg);
                return false
            }
        }
        /**
         * Validation function to be executed when sublist line is committed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateLine(scriptContext) {
            var objMsg = new Object();
            try {
                const { currentRecord, sublistId } = scriptContext;
                console.log({ title: 'currentRecord', details: currentRecord });
                if (sublistId === 'item') {
                    const dataLine = getDataLine(currentRecord, sublistId)
                    console.log({ title: 'Datos para validar', details: dataLine });
                    if (dataLine.action === true && dataLine.linea.length === 0) {
                        return true;
                    } else {
                        var dataMapping = obtenMaster(dataLine.linea);
                        console.log({ title: 'dataMapping', details: dataMapping });
                        var mensajeCustom = validaLines(dataMapping);
                        console.log({ title: 'mensajeCustom', details: mensajeCustom });
                        if (mensajeCustom === '') {
                            var pedimentoComplex = '';
                            dataMapping.forEach((line, index) => {
                                if (!pedimentoComplex.includes(line.pedimento)) {
                                    if ((dataMapping.length - 1) === index) {
                                        pedimentoComplex += line.pedimento;
                                    } else {
                                        pedimentoComplex += `${line.pedimento},`;
                                    }
                                }
                            });
                            console.log({ title: 'pedimentoComplex', details: pedimentoComplex });
                            var sliceComma = (pedimentoComplex.slice(pedimentoComplex.length - 1, pedimentoComplex.length) === ',');
                            var str2 = (sliceComma ? pedimentoComplex.slice(0, (pedimentoComplex.length - 1)) : pedimentoComplex);
                            currentRecord.setCurrentSublistValue({ sublistId, fieldId: RECORDS.SALES_ORDER.SUBLIST.FIELDS.NO_PEDIMENTO, value: str2 })
                            return true
                        } else {
                            objMsg.status = 'NOT_QTY'
                            objMsg.message = mensajeCustom;
                            createMessage(objMsg)
                        }
                    }
                } else {
                    return true
                }
                return false;
            } catch (e) {
                console.error({ title: 'Error validateLine:', details: e });
                objMsg.status = 'ERROR'
                objMsg.message = e
                createMessage(objMsg);
                return false
            }
        }
        const validaLines = (arrLines) => {
            try {
                var mensaje = ''
                arrLines.map(line => {
                    console.log({ title: 'line', details: line });
                    if (line.hasOwnProperty('noSerie')) {
                        mensaje += (line.pedimento === '' ? '<br/><b>' + line.item.text + '</b> no se puede abastecer la cantidad de <b>' + line.cantidad + '</b> para <b>' + line.noSerie + '</b>' : '')
                    } else {
                        mensaje += (line.pedimento === '' ? '<br/><b>' + line.item.text + '</b> no se puede abastecer la cantidad de <b>' + line.cantidad + '</b>' : '')
                    }

                })
                return mensaje;
            } catch (e) {
                console.error({ title: 'Error validaLines:', details: e });
                return 'Error ' + e.message
            }
        }
        const obtenMaster = (linea) => {
            try {
                const type = RECORDS.MASTER_PED.id;
                const filters = [];
                linea.forEach((linePib, index) => {
                    const filterPibote = []
                    if (linePib.hasOwnProperty('noSerie')) {
                        filterPibote.push([RECORDS.MASTER_PED.FIELDS.SERIE_LOTE, search.Operator.IS, linePib.noSerie]);
                        filterPibote.push('AND')
                    }
                    filterPibote.push([RECORDS.MASTER_PED.FIELDS.LOCATION, search.Operator.ANYOF, linePib.location.value]);
                    filterPibote.push('AND')
                    filterPibote.push([RECORDS.MASTER_PED.FIELDS.ITEM, search.Operator.ANYOF, linePib.item.value]);
                    if (linePib.pedimento !== '') {
                        filterPibote.push('AND')
                        const filterNoPed = [];
                        var arrPedimento = line.pedimento.split(',');
                        arrPedimento.forEach((noPed, index) => {
                            if ((arrPedimento.index - 1) === index) {
                                filterNoPed.push([RECORDS.MASTER_PED.FIELDS.NO_PEDIMENTO, search.Operator.IS, noPed]);
                            } else {
                                filterNoPed.push([RECORDS.MASTER_PED.FIELDS.NO_PEDIMENTO, search.Operator.IS, noPed], 'OR');
                            }
                        })
                        filterPibote.push(filterNoPed)
                    }
                    switch (linea.length - 1) {
                        case index:
                            filters.push(filterPibote)
                            break;
                        default:
                            filters.push(filterPibote, 'OR')
                            break;
                    }
                })
                const columns = [];
                Object.keys(RECORDS.MASTER_PED.FIELDS).forEach((fieldPib) => {
                    columns.push(search.createColumn({ name: RECORDS.MASTER_PED.FIELDS[fieldPib] }))
                })
                console.log({ title: 'filters', details: filters });
                var dataSSLine = getDataToSS(type, filters, columns);
                console.log({ title: 'dataSSLine', details: dataSSLine });
                
                console.log({ title: 'linea', details: linea });
                dataSSLine = getTransactionPending(linea, dataSSLine);

                linea.map((linePib, index) => {
                    var dataFound = null;
                    console.log({ title: 'linePib', details: linePib });
                    if (linePib.hasOwnProperty('noSerie')) {
                        if (linePib.pedimento !== '') {
                            dataFound = dataSSLine.results.find(dataRes =>
                                dataRes[RECORDS.MASTER_PED.FIELDS.ITEM].value === linePib.item.value &&
                                dataRes[RECORDS.MASTER_PED.FIELDS.LOCATION].value === linePib.location.value &&
                                linePib.pedimento.includes(dataRes[RECORDS.MASTER_PED.FIELDS.NO_PEDIMENTO]) &&
                                dataRes[RECORDS.MASTER_PED.FIELDS.SERIE_LOTE] === linePib.noSerie &&
                                Number(dataRes[RECORDS.MASTER_PED.FIELDS.QUANTITY_AVAILABLE]) >= Number(linePib.cantidad)
                            ) || null;
                        } else {
                            dataFound = dataSSLine.results.find(dataRes =>
                                dataRes[RECORDS.MASTER_PED.FIELDS.ITEM].value === linePib.item.value &&
                                dataRes[RECORDS.MASTER_PED.FIELDS.LOCATION].value === linePib.location.value &&
                                dataRes[RECORDS.MASTER_PED.FIELDS.SERIE_LOTE] === linePib.noSerie &&
                                Number(dataRes[RECORDS.MASTER_PED.FIELDS.QUANTITY_AVAILABLE]) >= Number(linePib.cantidad)
                            ) || null;
                        }
                    } else {
                        if (linePib.pedimento !== '') {
                            dataFound = dataSSLine.results.find(dataRes =>
                                dataRes[RECORDS.MASTER_PED.FIELDS.ITEM].value === linePib.item.value &&
                                dataRes[RECORDS.MASTER_PED.FIELDS.LOCATION].value === linePib.location.value &&
                                linePib.pedimento.includes(dataRes[RECORDS.MASTER_PED.FIELDS.NO_PEDIMENTO]) &&
                                Number(dataRes[RECORDS.MASTER_PED.FIELDS.QUANTITY_AVAILABLE]) >= Number(linePib.cantidad)
                            ) || null;
                        } else {
                            dataFound = dataSSLine.results.find(dataRes =>
                                dataRes[RECORDS.MASTER_PED.FIELDS.ITEM].value === linePib.item.value &&
                                dataRes[RECORDS.MASTER_PED.FIELDS.LOCATION].value === linePib.location.value &&
                                Number(dataRes[RECORDS.MASTER_PED.FIELDS.QUANTITY_AVAILABLE]) >= Number(linePib.cantidad)
                            ) || null;

                        }
                    }
                    if (dataFound) {
                        linePib.masterid = dataFound[RECORDS.MASTER_PED.FIELDS.INTERNAL_ID]
                        linePib.historicid = '';
                        linePib.pedimento = dataFound[RECORDS.MASTER_PED.FIELDS.NO_PEDIMENTO]
                    }
                    // return linePib;
                })
                return linea
            } catch (e) {
                log.error({ title: 'Error obtenMaster:', details: e });
                return []
            }
        }
        const getTransactionPending = (linea, dataSSLine) => {
            try {
                var type = RECORDS.SALES_ORDER.id;
                var filters1 = [];
                linea.forEach((linePib, index) => {
                    const filterPibote = []
                    filterPibote.push([RECORDS.SALES_ORDER.SUBLIST.FIELDS.LOCATION, search.Operator.ANYOF, linePib.location.value]);
                    filterPibote.push('AND')
                    filterPibote.push([RECORDS.SALES_ORDER.SUBLIST.FIELDS.ITEM, search.Operator.ANYOF, linePib.item.value]);
                    switch (linea.length - 1) {
                        case index:
                            filters1.push(filterPibote)
                            break;
                        default:
                            filters1.push(filterPibote, 'OR')
                            break;
                    }
                })
                var filters = [
                    ["mainline", "is", "F"],
                    "AND",
                    ["cogs", "is", "F"],
                    "AND",
                    ["taxline", "is", "F"],
                    "AND",
                    ["status", "anyof", "SalesOrd:D", "SalesOrd:B"],
                    "AND",
                    filters1
                ]

                var columns = [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "type" }),
                    search.createColumn({ name: "item" }),
                    search.createColumn({ name: "quantity" }),
                    search.createColumn({ name: "location" }),
                    search.createColumn({ name: "custcol_efx_ped_numero_pedimento" }),
                    search.createColumn({ name: "custcol_efx_ped_contains" }),
                    search.createColumn({ name: "inventorynumber", join: "inventoryDetail" }),
                    search.createColumn({ name: "quantity", join: "inventoryDetail" }),
                    search.createColumn({ name: "statusref" })
                ]
                var dataSSLineTransaction = getDataToSS(type, filters, columns);
                dataSSLineTransaction = dataSSLineTransaction.results.filter(data => Number(data.internalid.value) !== Number(linea[0].idTransaction))
                log.debug({ title: 'dataSSLineTransaction', details: dataSSLineTransaction });

                dataSSLine.results.map((line, index) => {
                    var dataFound = null;
                    if (line[RECORDS.MASTER_PED.FIELDS.SERIE_LOTE] !== '') {
                        dataFound = dataSSLineTransaction.find(dataSSPib =>
                            dataSSPib[RECORDS.SALES_ORDER.SUBLIST.FIELDS.ITEM].value === line[RECORDS.MASTER_PED.FIELDS.ITEM].value &&
                            dataSSPib[RECORDS.SALES_ORDER.SUBLIST.FIELDS.LOCATION].value === line[RECORDS.MASTER_PED.FIELDS.LOCATION].value &&
                            dataSSPib[RECORDS.SALES_ORDER.SUBLIST.FIELDS.NO_PEDIMENTO] === line[RECORDS.MASTER_PED.FIELDS.NO_PEDIMENTO] &&
                            dataSSPib.inventoryDetail.inventorynumber.text === line[RECORDS.MASTER_PED.FIELDS.SERIE_LOTE]
                        );
                    } else {
                        dataFound = dataSSLineTransaction.find(dataSSPib =>
                            dataSSPib[RECORDS.SALES_ORDER.SUBLIST.FIELDS.ITEM].value === line[RECORDS.MASTER_PED.FIELDS.ITEM].value &&
                            dataSSPib[RECORDS.SALES_ORDER.SUBLIST.FIELDS.LOCATION].value === line[RECORDS.MASTER_PED.FIELDS.LOCATION].value &&
                            dataSSPib[RECORDS.SALES_ORDER.SUBLIST.FIELDS.NO_PEDIMENTO] === line[RECORDS.MASTER_PED.FIELDS.NO_PEDIMENTO]
                        );
                    }
                    if(dataFound){
                        line[RECORDS.MASTER_PED.FIELDS.QUANTITY_AVAILABLE] = Number(line[RECORDS.MASTER_PED.FIELDS.QUANTITY_AVAILABLE]);
                        if (line[RECORDS.MASTER_PED.FIELDS.SERIE_LOTE] !== '') {
                            line[RECORDS.MASTER_PED.FIELDS.QUANTITY_AVAILABLE] -= Number(dataFound.inventoryDetail.quantity) 
                        }else{
                            line[RECORDS.MASTER_PED.FIELDS.QUANTITY_AVAILABLE] -= Number(dataFound[RECORDS.SALES_ORDER.SUBLIST.FIELDS.QUANTITY]) 
                        }
                    }
                });
                return dataSSLine;
            } catch (e) {
                log.error({ title: 'Error getTransactionPending:', details: e });
                return [];
            }
        }
        return {
            pageInit: pageInit,
            validateLine: validateLine,
            saveRecord: saveRecord
        };

    });
