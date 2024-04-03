/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/search', 'N/ui/message', '../Lib/constants.js', '../Lib/functions.js'],

    function (currentRecord, search, message, constants, functions) {
        var currRecord = currentRecord.get();
        const { RECORDS } = constants;
        const { createMessage, getDataLineIA, validateToUpdate, getDataToSS } = functions;
        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {
            try {
                console.log({ title: 'RECORDS.INVENTORY_ADJUSTMENT.FIELDS.NO_PEDIMENTO', details: RECORDS.INVENTORY_ADJUSTMENT.FIELDS.NO_PEDIMENTO });
                currRecord.getField({ fieldId: RECORDS.INVENTORY_ADJUSTMENT.FIELDS.NO_PEDIMENTO }).isDisabled = true;
            } catch (e) {
                console.error({ title: 'Error pageInit:', details: e });
            }

        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {
            try {
                const { fieldId } = scriptContext;
                switch (fieldId) {
                    case RECORDS.INVENTORY_ADJUSTMENT.FIELDS.TYPE_MOVEMENT:
                        currRecord.setValue({ fieldId: RECORDS.INVENTORY_ADJUSTMENT.FIELDS.NO_PEDIMENTO, value: '' });
                        const value = currRecord.getValue({ fieldId });
                        // 
                        if (value === '1') {
                            console.log({ title: 'Iniciando la entrada para pedimentos', details: true });
                            currRecord.getField({ fieldId: RECORDS.INVENTORY_ADJUSTMENT.FIELDS.NO_PEDIMENTO }).isDisabled = false;
                        } else if (value == '2') {
                            console.log({ title: 'Iniciando la salida para pedimentos', details: true });
                            currRecord.getField({ fieldId: RECORDS.INVENTORY_ADJUSTMENT.FIELDS.NO_PEDIMENTO }).isDisabled = true;
                        } else {
                            currRecord.getField({ fieldId: RECORDS.INVENTORY_ADJUSTMENT.FIELDS.NO_PEDIMENTO }).isDisabled = true;
                        }

                        // Eliminando lineas para evitar colocar lineas erroneas
                        const numLines = currRecord.getLineCount({ sublistId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.id })
                        for (let lineIndex = 0; lineIndex < numLines; lineIndex++) {
                            currRecord.removeLine({ sublistId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.id, line: lineIndex, ignoreRecalc: true });
                        }
                        break;

                }
            } catch (e) {
                console.error({ title: 'Error fieldChanged:', details: e });
            }
        }

        /**
         * Function to be executed when field is slaved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         *
         * @since 2015.2
         */
        function postSourcing(scriptContext) {

        }

        /**
         * Function to be executed after sublist is inserted, removed, or edited.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function sublistChanged(scriptContext) {

        }

        /**
         * Function to be executed after line is selected.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function lineInit(scriptContext) {

        }

        /**
         * Validation function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @returns {boolean} Return true if field is valid
         *
         * @since 2015.2
         */
        function validateField(scriptContext) {

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
            try {
                const { sublistId } = scriptContext
                const objMsg = new Object();
                var conditionValidateLine = false;
                const noPedimento = currRecord.getValue({ fieldId: RECORDS.INVENTORY_ADJUSTMENT.FIELDS.NO_PEDIMENTO });
                const typeMovement = currRecord.getValue({ fieldId: RECORDS.INVENTORY_ADJUSTMENT.FIELDS.TYPE_MOVEMENT });

                if (sublistId === RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.id) {
                    const cantidadLinea = parseFloat(currRecord.getCurrentSublistValue({ sublistId, fieldId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.FIELDS.QUANTITY }));
                    console.log({ title: 'cantidadLinea', details: cantidadLinea });
                    switch (typeMovement) {
                        case '1':
                            // Valida que se tenga el numero de pedimento para poder realizar el ingreso de inventario, esto se establece por el tipo de movimiento
                            if (noPedimento === '') {
                                conditionValidateLine = false;
                                objMsg.status = 'NOT_NO_PED';
                                objMsg.message = 'Esta intentando hacer un ingreso de pedimento sin colocar el numero de pedimento.<br/>Verifique su entrada.';
                                createMessage(objMsg);
                                break;
                            }
                            // Validamos que la cantidad sea positiva  de lo contrario se tiene que mostrar un mensaje relacionado a la cantidad incorrecta
                            if (cantidadLinea < 0) {
                                conditionValidateLine = false;
                                objMsg.status = 'NOT_NEGATIVO';
                                objMsg.message = 'Esta intentando hacer un ingreso de cantidad negativa en una entrada de inventario.<br/>Verifique su entrada.';
                                createMessage(objMsg);
                                break;
                            }
                            var lineData = getDataLineIA(currRecord, sublistId);
                            console.log({ title: 'Linea para ingreso:', details: lineData });
                            console.log({ title: 'Datos para validar:', details: { id: currRecord.id, isNew: currRecord.isNew, type: currRecord.type } });
                            var flag = true;
                            lineData.linea.forEach(lineDatum => {
                                if (!lineDatum.tienePedimento) {
                                    flag = false;
                                }
                            })
                            conditionValidateLine = flag;
                            break;
                        case '2':
                            if (noPedimento !== '') {
                                conditionValidateLine = false;
                                objMsg.status = 'NOT_PED'
                                objMsg.message = 'Esta intentando hacer una salida de inventario, no coloque el numero de pedimento.<br/>Verifique su entrada.'
                                createMessage(objMsg);
                                break;
                            }
                            // Validamos que la cantidad sea positiva  de lo contrario se tiene que mostrar un mensaje relacionado a la cantidad incorrecta
                            if (cantidadLinea > 0) {
                                conditionValidateLine = false;
                                objMsg.status = 'NOT_NEGATIVO';
                                objMsg.message = 'Esta intentando hacer una salida de cantidad positiva en una salida de inventario.<br/>Verifique su entrada.';
                                createMessage(objMsg);
                                break;
                            }
                            var dataLine = getDataLineIA(currRecord, sublistId);
                            console.log({ title: 'Linea para consumo :', details: dataLine });
                            console.log({ title: 'Datos para validar:', details: { id: currRecord.id, isNew: currRecord.isNew, type: currRecord.type } });
                            // const dataTran = { id: currRecord.id, isNew: currRecord.isNew, type: currRecord.type }
                            if (dataLine.action === true && dataLine.linea.length === 0) {
                                return true;
                            } else {
                                var dataMapping = obtenMaster(dataLine.linea);
                                console.log({ title: 'dataMapping', details: dataMapping });
                                if (dataMapping?.length > 0) {
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
                                        currRecord.setCurrentSublistValue({ sublistId, fieldId: RECORDS.SALES_ORDER.SUBLIST.FIELDS.NO_PEDIMENTO, value: str2 })
                                        return true
                                    } else {
                                        objMsg.status = 'NOT_QTY'
                                        objMsg.message = mensajeCustom;
                                        createMessage(objMsg)
                                    }
                                }
                            }
                            break;
                        default:
                            conditionValidateLine = true;
                            break;
                    }
                }
                return conditionValidateLine;
            } catch (e) {
                console.error({ title: 'Error validateLine:', details: e });
                return false;
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
                    if (dataFound) {
                        line[RECORDS.MASTER_PED.FIELDS.QUANTITY_AVAILABLE] = Number(line[RECORDS.MASTER_PED.FIELDS.QUANTITY_AVAILABLE]);
                        if (line[RECORDS.MASTER_PED.FIELDS.SERIE_LOTE] !== '') {
                            line[RECORDS.MASTER_PED.FIELDS.QUANTITY_AVAILABLE] -= Number(dataFound.inventoryDetail.quantity)
                        } else {
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
        /**
         * Validation function to be executed when sublist line is inserted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateInsert(scriptContext) {

        }

        /**
         * Validation function to be executed when record is deleted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateDelete(scriptContext) {

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

        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            validateLine: validateLine,
            // postSourcing: postSourcing,
            // sublistChanged: sublistChanged,
            // lineInit: lineInit,
            // validateField: validateField,
            // validateInsert: validateInsert,
            // validateDelete: validateDelete,
            // saveRecord: saveRecord
        };

    });
