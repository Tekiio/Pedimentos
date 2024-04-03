/**
 * @NApiVersion 2.1
 */
define(['N/log', 'N/search', 'N/record', 'N/ui/message', './constants.js'],
    (log, search, record, message, constants) => {
        const { RECORDS } = constants;

        // Se obtiene los datos mediante una busqueda guardada mapeando la información
        const getDataToSS = (type, filters, columns) => {
            const dataResult = {
                status: true,
                count: 0,
                results: [],
                details: ''
            }
            try {
                // Creacion de la busqueda guardada 
                const searchObj = search.create({ type, filters, columns });
                const columnsName = searchObj.run().columns;
                // log.debug({ title: 'columnsName', details: columnsName });
                const countResult = searchObj.runPaged().count;
                if (countResult) {
                    dataResult.count = countResult
                    // Si excede de los 1000 resultados realiza una paginacion para evitar que se rompa el desarrollo
                    if (countResult > 1000) {
                        const dataResults = searchObj.runPaged({ pageSize: 1000 });
                        const { pageRanges } = dataResults
                        pageRanges.forEach(({ index }) => {
                            dataResults.fetch({ index })?.data.forEach(result => {
                                const objPib = {};
                                columns.forEach(({ name, join, formula }) => {
                                    // if (!objPib?.[name]) objPib[name] = {}
                                    const values = {};
                                    const columnaPib = (join ? columnsName.find(namePib => namePib.name === name && namePib.join === join) : columnsName.find(namePib => namePib.name === name));

                                    let text = result.getText(columnaPib);
                                    let value = result.getValue(columnaPib)
                                    if (text) {
                                        values.text = text;
                                        values.value = value;
                                    } else {
                                        values = value;
                                    }
                                    if (join) {
                                        if (!objPib?.[join]) {
                                            objPib[join] = {}
                                        }
                                        objPib[join][name] = values
                                    } else {
                                        if (!objPib?.[name]) {
                                            objPib[name] = {}
                                        }
                                        objPib[name] = values
                                    }
                                })
                                dataResult.results.push(objPib);
                            })
                        })
                    } else {
                        // Si no excede de los 1000 resultados ejecuta con esta funcion para optimizar la busqueda de los resultados
                        searchObj.run().each(result => {
                            const objPib = {};
                            columns.forEach(({ name, join, formula }) => {
                                // if (!objPib?.[name]) objPib[name] = {}
                                let values = {}
                                const columnaPib = (join ? columnsName.find(namePib => namePib.name === name && namePib.join === join) : columnsName.find(namePib => namePib.name === name))
                                let text = result.getText(columnaPib);
                                let value = result.getValue(columnaPib)
                                // log.debug({ title: 'Datos Busqueda:', details: { text, value, columnaPib } });
                                if (text) {
                                    values.text = text;
                                    values.value = value;
                                } else {
                                    values = value;
                                }
                                if (join) {
                                    if (!objPib?.[join]) {
                                        objPib[join] = {}
                                    }
                                    objPib[join][name] = values
                                } else {
                                    if (!objPib?.[name]) {
                                        objPib[name] = {}
                                    }
                                    objPib[name] = values
                                }
                            })
                            dataResult.results.push(objPib);
                            return true;
                        });
                    }
                } else {
                    dataResult.details = countResult === 0 ? '' : 'Error al obtener los resultados.'
                }

            } catch (e) {
                log.error({ title: 'Error getDataToSS:', details: e });
                dataResult.status = false;
                dataResult.count = 0;
                dataResult.results = [];
                dataResult.details = e.message
            }
            return dataResult
        }
        // Se obtienen los datos de la transaccion, hasta el momento solamente Recepcion de articulo
        const getInfoToTransaction = (id, type) => {
            try {

                var record_now = record.load({ type: type, id: id, isDynamic: true })

                const LINE_COUNT = record_now.getLineCount({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id });
                log.audit({ title: 'Numero de lineas', details: LINE_COUNT });

                // Si proviene de un Inboun Shipment obtiene su id y su numero de pedimento
                var idInbShip = record_now.getValue({ fieldId: RECORDS.ITEM_RECEIPT.FIELDS.INBOUND_SHIPMENT });
                log.debug({ title: 'idInbShip', details: idInbShip });
                var noPedimento = '';
                if (idInbShip) {
                    let columnaSearch = [RECORDS.INBOUND_SHIPMENT.FIELDS.NO_PEDIMENTO];
                    noPedimento = search.lookupFields({ type: RECORDS.INBOUND_SHIPMENT.id, id: idInbShip, columns: columnaSearch })[RECORDS.INBOUND_SHIPMENT.FIELDS.NO_PEDIMENTO];
                    log.debug({ title: 'noPedimento', details: noPedimento });
                } else {
                    noPedimento = record_now.getValue({ fieldId: RECORDS.ITEM_RECEIPT.FIELDS.NO_PEDIMENTO });
                }

                var array_pedimentoObj = [];
                for (var i = 0; i < LINE_COUNT; i++) {
                    var pedObj = {
                        idTransaction: id,
                        typeTransaction: type,
                        noSerie: '',
                        pedimento: '',
                        item: {
                            value: '', text: ''
                        },
                        cantidad: '',
                        costo: '',
                        total: '',
                        tienePedimento: false,
                        location: {
                            value: '', text: ''
                        }
                    }
                    var containPed = record_now.getSublistValue({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.CONTAIN_PEDIMENTO, line: i }) || false;
                    if (containPed) {
                        pedObj.item.value = record_now.getSublistValue({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.ITEM, line: i }) || 'NA';
                        pedObj.item.text = record_now.getSublistText({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.ITEM_NAME, line: i }) || 'NA';

                        pedObj.location.value = record_now.getSublistValue({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.LOCATION, line: i }) || 'NA';
                        pedObj.location.text = record_now.getSublistText({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.LOCATION, line: i }) || 'NA';

                        pedObj.costo = parseFloat(record_now.getSublistValue({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.RATE, line: i })) || 0;
                        pedObj.tienePedimento = containPed;
                        let noPedimentoLine = record_now.getValue({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.NO_PEDIMENTO, line: i })
                        pedObj.pedimento = noPedimentoLine || noPedimento;

                        var arrInvDetail = []
                        // Validamos si existe un detalle de inventario
                        // var inventoryDetail = record_now.getSublistSubrecord({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.INVENTORY_DETAIL, line: i });
                        var containInventoryDetail = record_now.getSublistValue({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.CONTAIN_INVENTORY_DETAIL, line: i });
                        log.debug({ title: 'containInventoryDetail', details: containInventoryDetail });
                        if (containInventoryDetail === 'T') {
                            record_now.selectLine({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, line: i });
                            var inventoryDetail = record_now.getCurrentSublistSubrecord({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.INVENTORY_DETAIL });
                            var countInventoryDetail = inventoryDetail.getLineCount({ sublistId: 'inventoryassignment' });
                            for (let indexInvDet = 0; indexInvDet < countInventoryDetail; indexInvDet++) {
                                log.debug({ title: 'inventoryDetail', details: inventoryDetail });
                                var invDetNum = inventoryDetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', line: indexInvDet })
                                var invDetQty = inventoryDetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: indexInvDet })
                                arrInvDetail.push({ invDetNum, invDetQty })
                            }
                        }

                        // Colocando las lineas dentro del arreglo de las lineas
                        if (arrInvDetail.length > 0) {
                            arrInvDetail.forEach(invDet => {
                                var newPedObj = Object.assign({}, pedObj)
                                newPedObj.noSerie = invDet.invDetNum
                                newPedObj.cantidad = invDet.invDetQty
                                if (newPedObj.pedimento) {
                                    newPedObj.total = parseFloat(newPedObj.costo) * parseFloat(newPedObj.cantidad);
                                    array_pedimentoObj.push(newPedObj)
                                }
                            })
                        } else {
                            delete pedObj.noSerie
                            pedObj.cantidad = parseFloat(record_now.getSublistValue({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.QUANTITY, line: i })) || '';
                            pedObj.total = parseFloat(pedObj.costo) * parseFloat(pedObj.cantidad);
                            if (pedObj.pedimento) {
                                array_pedimentoObj.push(pedObj)
                            }
                        }
                    }
                }
                log.debug({ title: 'Lineas de la recepcion del articulo:', details: array_pedimentoObj });
                return array_pedimentoObj;
            } catch (e) {
                log.error({ title: 'Error getInfoToTransaction:', details: e });
                return []
            }
        }
        // Se obtienen los datos de la transaccion, hasta el momento solamente Ejecucion de pedido
        const getInfoToTransactionIF = (id, type) => {
            try {

                var record_now = record.load({ type: type, id: id, isDynamic: true });

                const LINE_COUNT = record_now.getLineCount({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id });
                log.audit({ title: 'Numero de lineas', details: LINE_COUNT });

                var array_pedimentoObj = [];
                for (var i = 0; i < LINE_COUNT; i++) {
                    var pedObj = {
                        idTransaction: id,
                        typeTransaction: type,
                        noSerie: '',
                        pedimento: '',
                        item: {
                            value: '', text: ''
                        },
                        cantidad: '',
                        costo: '',
                        total: '',
                        tienePedimento: false,
                        location: {
                            value: '', text: ''
                        }
                    }
                    var containPed = record_now.getSublistValue({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.CONTAIN_PEDIMENTO, line: i }) || false;
                    if (containPed) {
                        pedObj.item.value = record_now.getSublistValue({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.ITEM, line: i }) || 'NA';
                        pedObj.item.text = record_now.getSublistText({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.ITEM_NAME, line: i }) || 'NA';

                        pedObj.location.value = record_now.getSublistValue({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.LOCATION, line: i }) || 'NA';
                        pedObj.location.text = record_now.getSublistText({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.LOCATION, line: i }) || 'NA';

                        pedObj.costo = parseFloat(record_now.getSublistValue({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.RATE, line: i })) || 0;
                        pedObj.tienePedimento = containPed;
                        pedObj.pedimento = record_now.getSublistValue({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.NO_PEDIMENTO, line: i })

                        var arrInvDetail = []
                        // Validamos si existe un detalle de inventario
                        // var inventoryDetail = record_now.getSublistSubrecord({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.INVENTORY_DETAIL, line: i });
                        var containInventoryDetail = record_now.getSublistValue({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.CONTAIN_INVENTORY_DETAIL, line: i });
                        log.debug({ title: 'containInventoryDetail', details: containInventoryDetail });
                        if (containInventoryDetail === 'T') {
                            record_now.selectLine({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, line: i });
                            var inventoryDetail = record_now.getCurrentSublistSubrecord({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.INVENTORY_DETAIL });
                            var countInventoryDetail = inventoryDetail.getLineCount({ sublistId: 'inventoryassignment' });
                            for (let indexInvDet = 0; indexInvDet < countInventoryDetail; indexInvDet++) {
                                log.debug({ title: 'inventoryDetail', details: inventoryDetail });
                                var invDetNum = inventoryDetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', line: indexInvDet })
                                var invDetQty = inventoryDetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: indexInvDet })
                                var internalid = inventoryDetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', line: indexInvDet })
                                arrInvDetail.push({ invDetNum, invDetQty, internalid })
                                log.debug({ title: 'Detalle de inventario:', details: arrInvDetail[(arrInvDetail.length - 1)] });
                            }
                        }

                        // Colocando las lineas dentro del arreglo de las lineas
                        if (arrInvDetail.length > 0) {
                            arrInvDetail.forEach(invDet => {
                                var newPedObj = Object.assign({}, pedObj)
                                newPedObj.idSerie = invDet.internalid;
                                newPedObj.noSerie = invDet.invDetNum || ''
                                newPedObj.cantidad = invDet.invDetQty
                                log.debug({ title: 'newPedObj', details: newPedObj });
                                if (newPedObj.pedimento) {
                                    newPedObj.total = parseFloat(newPedObj.costo) * parseFloat(newPedObj.cantidad);
                                    array_pedimentoObj.push(newPedObj)
                                }
                            })
                        } else {
                            delete pedObj.noSerie
                            pedObj.cantidad = parseFloat(record_now.getSublistValue({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.QUANTITY, line: i })) || '';
                            pedObj.total = parseFloat(pedObj.costo) * parseFloat(pedObj.cantidad);
                            log.debug({ title: 'pedObj', details: pedObj });
                            if (pedObj.pedimento) {
                                array_pedimentoObj.push(pedObj)
                            }
                        }
                    }
                }
                log.debug({ title: 'Lineas de la recepcion del articulo:', details: array_pedimentoObj });
                return array_pedimentoObj;
            } catch (e) {
                log.error({ title: 'Error getInfoToTransactionIF:', details: e });
                return []
            }
        }
        const getInfoToTransactionIA = (id, type) => {
            try {

                var record_now = record.load({ type: type, id: id, isDynamic: true });
                var typeMovement = record_now.getValue({ fieldId: RECORDS.INVENTORY_ADJUSTMENT.FIELDS.TYPE_MOVEMENT })
                var noPedimentoBody = record_now.getValue({ fieldId: RECORDS.INVENTORY_ADJUSTMENT.FIELDS.NO_PEDIMENTO })
                const LINE_COUNT = record_now.getLineCount({ sublistId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.id });
                log.audit({ title: 'Numero de lineas', details: LINE_COUNT });

                var array_pedimentoObj = [];
                for (var i = 0; i < LINE_COUNT; i++) {
                    var pedObj = {
                        idTransaction: id,
                        typeTransaction: type,
                        noSerie: '',
                        pedimento: '',
                        item: {
                            value: '', text: ''
                        },
                        cantidad: '',
                        costo: '',
                        total: '',
                        tienePedimento: false,
                        location: {
                            value: '', text: ''
                        }
                    }
                    var containPed = record_now.getSublistValue({ sublistId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.id, fieldId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.FIELDS.CONTAIN_PEDIMENTO, line: i }) || false;
                    if (containPed) {
                        pedObj.item.value = record_now.getSublistValue({ sublistId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.id, fieldId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.FIELDS.ITEM, line: i }) || 'NA';
                        pedObj.item.text = record_now.getSublistText({ sublistId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.id, fieldId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.FIELDS.ITEM_NAME, line: i }) || 'NA';

                        pedObj.location.value = record_now.getSublistValue({ sublistId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.id, fieldId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.FIELDS.LOCATION, line: i }) || 'NA';
                        pedObj.location.text = record_now.getSublistText({ sublistId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.id, fieldId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.FIELDS.LOCATION, line: i }) || 'NA';

                        pedObj.costo = parseFloat(record_now.getSublistValue({ sublistId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.id, fieldId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.FIELDS.RATE, line: i })) || 0;
                        pedObj.tienePedimento = containPed;
                        switch (typeMovement) {
                            case '1':
                                pedObj.pedimento = noPedimentoBody;
                                break;
                            case '2':
                                pedObj.pedimento = record_now.getSublistValue({ sublistId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.id, fieldId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.FIELDS.NO_PEDIMENTO, line: i })
                                break;
                        }

                        var arrInvDetail = []
                        // Validamos si existe un detalle de inventario
                        // var inventoryDetail = record_now.getSublistSubrecord({ sublistId: RECORDS.ITEM_RECEIPT.SUBLIST.id, fieldId: RECORDS.ITEM_RECEIPT.SUBLIST.FIELDS.INVENTORY_DETAIL, line: i });
                        var containInventoryDetail = record_now.getSublistValue({ sublistId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.id, fieldId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.FIELDS.CONTAIN_INVENTORY_DETAIL, line: i });
                        log.debug({ title: 'containInventoryDetail', details: containInventoryDetail });
                        if (containInventoryDetail === 'T') {
                            record_now.selectLine({ sublistId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.id, line: i });
                            var inventoryDetail = record_now.getCurrentSublistSubrecord({ sublistId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.id, fieldId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.FIELDS.INVENTORY_DETAIL });
                            var countInventoryDetail = inventoryDetail.getLineCount({ sublistId: 'inventoryassignment' });
                            for (let indexInvDet = 0; indexInvDet < countInventoryDetail; indexInvDet++) {
                                log.debug({ title: 'inventoryDetail', details: inventoryDetail });
                                var invDetNum = inventoryDetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', line: indexInvDet })
                                var invDetQty = inventoryDetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: indexInvDet })
                                var internalid = inventoryDetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', line: indexInvDet })
                                arrInvDetail.push({ invDetNum, invDetQty, internalid })
                                log.debug({ title: 'Detalle de inventario:', details: arrInvDetail[(arrInvDetail.length - 1)] });
                            }
                        }

                        // Colocando las lineas dentro del arreglo de las lineas
                        if (arrInvDetail.length > 0) {
                            arrInvDetail.forEach(invDet => {
                                var newPedObj = Object.assign({}, pedObj)
                                newPedObj.idSerie = invDet.internalid;
                                newPedObj.noSerie = invDet.invDetNum || ''
                                newPedObj.cantidad = Math.abs(invDet.invDetQty)
                                log.debug({ title: 'newPedObj', details: newPedObj });
                                if (newPedObj.pedimento) {
                                    newPedObj.total = parseFloat(newPedObj.costo) * parseFloat(newPedObj.cantidad);
                                    array_pedimentoObj.push(newPedObj)
                                }
                            })
                        } else {
                            delete pedObj.noSerie
                            pedObj.cantidad = Math.abs(parseFloat(record_now.getSublistValue({ sublistId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.id, fieldId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.FIELDS.QUANTITY, line: i }))) || 0;
                            pedObj.total = parseFloat(pedObj.costo) * parseFloat(pedObj.cantidad);
                            log.debug({ title: 'pedObj', details: pedObj });
                            if (pedObj.pedimento) {
                                array_pedimentoObj.push(pedObj)
                            }
                        }
                    }
                }
                log.debug({ title: 'Lineas de la recepcion del articulo:', details: array_pedimentoObj });
                return array_pedimentoObj;
            } catch (e) {
                log.error({ title: 'Error getInfoToTransactionIF:', details: e });
                return []
            }
        }
        // Valida la informacion usando los datos obtenidos de 🟢getInfoToTransaction🟢
        const validateToUpdate = (arrLine, id, type) => {
            try {

                const filtersHistoric = [[RECORDS.HISTORIC.FIELDS.TRAN_RELATED, search.Operator.IS, id]];
                const columnsHistoric = [];
                log.debug({ title: 'filtersHistoric', details: filtersHistoric });
                Object.keys(RECORDS.HISTORIC.FIELDS).forEach((fieldPib) => {
                    columnsHistoric.push(search.createColumn({ name: RECORDS.HISTORIC.FIELDS[fieldPib] }))
                })
                var dataHistoric = {
                    status: false,
                    count: 0,
                    results: [],
                    details: ''
                };
                if (id !== '') {
                    dataHistoric = getDataToSS(RECORDS.HISTORIC.id, filtersHistoric, columnsHistoric);
                }
                log.debug({ title: 'dataHistoric', details: dataHistoric });

                // Valida la informacion que se obtuvo a nivel linea comparandola con la que se tiene en Netsuite(Historico)
                arrLine.map((line, index) => {
                    var lineFound = null;
                    // Buscamos el articulo dependiendo si es de serie/lote o no
                    if (line.hasOwnProperty('noSerie')) {
                        lineFound = dataHistoric.results.find(historic =>
                            historic[RECORDS.HISTORIC.FIELDS.ITEM].value === line.item.value &&
                            historic[RECORDS.HISTORIC.FIELDS.LOCATION].value === line.location.value &&
                            historic[RECORDS.HISTORIC.FIELDS.SERIE_LOTE] === line.noSerie) || null;
                    } else {
                        lineFound = dataHistoric.results.find(historic =>
                            historic[RECORDS.HISTORIC.FIELDS.ITEM].value === line.item.value &&
                            historic[RECORDS.HISTORIC.FIELDS.LOCATION].value === line.location.value) || null;
                    }
                    log.debug({ title: 'lineFound', details: lineFound });
                    // Si se encuentra el objeto
                    if (lineFound) {

                        const difference = line.cantidad - Number(lineFound[RECORDS.HISTORIC.FIELDS.QUANTITY]);
                        line.difference = Math.abs(difference);
                        line.actionUpdate = Math.sign(difference)
                        if (difference !== 0) {
                            line.masterId = lineFound[RECORDS.HISTORIC.FIELDS.INTERNAL_ID].value;
                            line.historicId = lineFound[RECORDS.HISTORIC.FIELDS.INTERNAL_ID].value;
                            line.action = 'update';
                        } else {
                            line.masterId = lineFound[RECORDS.HISTORIC.FIELDS.INTERNAL_ID].value;
                            line.historicId = lineFound[RECORDS.HISTORIC.FIELDS.INTERNAL_ID].value;
                            // line.action = 'nothing';
                            line.action = 'update';
                        }
                    } else {
                        line.masterId = ''//lineFound[RECORDS.HISTORIC.FIELDS.NO_PEDIMENTO];
                        line.historicId = ''//lineFound[RECORDS.HISTORIC.FIELDS.NO_PEDIMENTO];
                        line.action = 'create';
                    }
                    return line;
                });
                var arrLine2 = arrLine.filter((line) => line.action !== 'nothing')
                log.debug({ title: 'arrLine', details: arrLine2 });
                return { update: arrLine.length > 0, arrToUpdate: arrLine2 }
            } catch (e) {
                log.error({ title: 'Error validateToUpdate:', details: e });
                return { update: false, arrToUpdate: [] }
            }
        }
        // Agrupa la informacion usando
        const bloques = (data, div) => {
            try {
                const BLOCK_RESULTS = div;
                log.debug('Iniciando el bloque de resultados:', BLOCK_RESULTS)
                const BLOCKS_DATA = []
                for (let i = 0; i < data.length; i += BLOCK_RESULTS) {
                    const block = data.slice(i, i + BLOCK_RESULTS)
                    if (block.length > 0) {
                        BLOCKS_DATA.push(block)
                    }
                }
                return BLOCKS_DATA
            } catch (e) {
                log.error({ title: 'Error bloques:', details: e });
            }
        }
        // Se obtienen los datos de la linea actual, considerando el uso solamente para el tema de Sales order
        const getDataLine = (currentRecord, sublistId) => {
            try {
                const array_pedimentoObj = [];
                var pedObj = {
                    idTransaction: (currentRecord.idNew || currentRecord.id),
                    typeTransaction: currentRecord.type,
                    noSerie: '',
                    pedimento: currentRecord.getCurrentSublistValue({ sublistId, fieldId: RECORDS.SALES_ORDER.SUBLIST.FIELDS.NO_PEDIMENTO }) || '',
                    contain_inv_det: currentRecord.getCurrentSublistValue({ sublistId, fieldId: RECORDS.SALES_ORDER.SUBLIST.FIELDS.CONTAIN_INVENTORY_DETAIL }) || 'F',
                    item: {
                        value: currentRecord.getCurrentSublistValue({ sublistId, fieldId: RECORDS.SALES_ORDER.SUBLIST.FIELDS.ITEM }),
                        text: currentRecord.getCurrentSublistValue({ sublistId, fieldId: RECORDS.SALES_ORDER.SUBLIST.FIELDS.ITEM_NAME })
                    },
                    cantidad: 0,
                    costo: 0,
                    total: 0,
                    tienePedimento: currentRecord.getCurrentSublistValue({ sublistId, fieldId: RECORDS.SALES_ORDER.SUBLIST.FIELDS.CONTAIN_PEDIMENTO }),
                    location: {
                        value: currentRecord.getCurrentSublistValue({ sublistId, fieldId: RECORDS.SALES_ORDER.SUBLIST.FIELDS.LOCATION }),
                        text: currentRecord.getCurrentSublistValue({ sublistId, fieldId: RECORDS.SALES_ORDER.SUBLIST.FIELDS.LOCATION_NAME })
                    }
                };
                console.log({ title: 'pedObj', details: pedObj });
                if (pedObj.tienePedimento === true) {
                    const arrInvDetail = []
                    if (pedObj.contain_inv_det === 'T') {
                        var inventoryDetail = currentRecord.getCurrentSublistSubrecord({ sublistId, fieldId: RECORDS.SALES_ORDER.SUBLIST.FIELDS.INVENTORY_DETAIL });
                        console.log({ title: 'inventoryDetail', details: inventoryDetail });
                        var countInventoryDetail = inventoryDetail.getLineCount({ sublistId: RECORDS.INVENTORY_DETAIL.SUBLIST.id });
                        for (let indexInvDet = 0; indexInvDet < countInventoryDetail; indexInvDet++) {
                            var serialLotId = parseInt(inventoryDetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', line: indexInvDet }))
                            var invDetNum = search.lookupFields({ type: 'inventorynumber', id: serialLotId, columns: 'inventorynumber' }).inventorynumber
                            // var invDetNum = inventoryDetail.getSublistValue({ sublistId: RECORDS.INVENTORY_DETAIL.SUBLIST.id, fieldId: 'receiptinventorynumber', line: indexInvDet })
                            var invDetQty = inventoryDetail.getSublistValue({ sublistId: RECORDS.INVENTORY_DETAIL.SUBLIST.id, fieldId: 'quantity', line: indexInvDet })
                            arrInvDetail.push({ invDetNum, invDetQty });
                        }
                        console.log({ title: 'arrInvDetail', details: arrInvDetail });
                    }

                    if (arrInvDetail.length > 0) {
                        arrInvDetail.forEach(invDet => {
                            var newPedObj = Object.assign({}, pedObj)
                            newPedObj.noSerie = invDet.invDetNum
                            newPedObj.cantidad = invDet.invDetQty
                            array_pedimentoObj.push(newPedObj);
                        })
                    } else {
                        delete pedObj.noSerie
                        pedObj.cantidad = parseFloat(currentRecord.getCurrentSublistValue({ sublistId, fieldId: RECORDS.SALES_ORDER.SUBLIST.FIELDS.QUANTITY })) || '';
                        array_pedimentoObj.push(pedObj)
                    }
                } else {
                    return { action: true, linea: [] }
                }
                console.log({ title: 'array_pedimentoObj', details: array_pedimentoObj });
                return { action: (array_pedimentoObj.length > 0), linea: array_pedimentoObj }
            } catch (e) {
                console.error({ title: 'Error getDataLine:', details: e });
                return { action: false, linea: [] }
            }
        }
        const getDataLineIA = (currentRecord, sublistId) => {
            try {
                const noPedimento = currentRecord.getValue({ fieldId: RECORDS.INVENTORY_ADJUSTMENT.FIELDS.NO_PEDIMENTO });
                const typeMovement = currentRecord.getValue({ fieldId: RECORDS.INVENTORY_ADJUSTMENT.FIELDS.TYPE_MOVEMENT });
                const array_pedimentoObj = [];
                var pedObj = {
                    idTransaction: (currentRecord.idNew || currentRecord.id),
                    typeTransaction: currentRecord.type,
                    noSerie: '',
                    pedimento: '',
                    contain_inv_det: currentRecord.getCurrentSublistValue({ sublistId, fieldId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.FIELDS.CONTAIN_INVENTORY_DETAIL }) || 'F',
                    item: {
                        value: currentRecord.getCurrentSublistValue({ sublistId, fieldId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.FIELDS.ITEM }),
                        text: currentRecord.getCurrentSublistValue({ sublistId, fieldId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.FIELDS.ITEM_NAME })
                    },
                    cantidad: 0,
                    costo: 0,
                    total: 0,
                    tienePedimento: currentRecord.getCurrentSublistValue({ sublistId, fieldId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.FIELDS.CONTAIN_PEDIMENTO }),
                    location: {
                        value: currentRecord.getCurrentSublistValue({ sublistId, fieldId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.FIELDS.LOCATION }),
                        text: currentRecord.getCurrentSublistValue({ sublistId, fieldId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.FIELDS.LOCATION_NAME })
                    }
                };
                switch (typeMovement) {
                    case '1':
                        pedObj.pedimento = noPedimento
                        break;
                    case '2':
                        pedObj.pedimento = currentRecord.getCurrentSublistValue({ sublistId, fieldId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.FIELDS.NO_PEDIMENTO })
                        break;
                }
                console.log({ title: 'pedObj', details: pedObj });
                if (pedObj.tienePedimento === true) {
                    const arrInvDetail = []
                    if (pedObj.contain_inv_det === 'T') {
                        var inventoryDetail = currentRecord.getCurrentSublistSubrecord({ sublistId, fieldId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.FIELDS.INVENTORY_DETAIL });
                        console.log({ title: 'inventoryDetail', details: inventoryDetail });
                        var countInventoryDetail = inventoryDetail.getLineCount({ sublistId: RECORDS.INVENTORY_DETAIL.SUBLIST.id });
                        for (let indexInvDet = 0; indexInvDet < countInventoryDetail; indexInvDet++) {
                            var serialLotId = parseInt(inventoryDetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', line: indexInvDet }));
                            console.log({ title: 'serialLotId', details: serialLotId });
                            var invDetNum = '';
                            if (serialLotId) {
                                invDetNum = search.lookupFields({ type: 'inventorynumber', id: serialLotId, columns: 'inventorynumber' }).inventorynumber
                            } else {
                                invDetNum = inventoryDetail.getSublistValue({ sublistId: RECORDS.INVENTORY_DETAIL.SUBLIST.id, fieldId: 'receiptinventorynumber', line: indexInvDet })
                            }
                            // var invDetNum = inventoryDetail.getSublistValue({ sublistId: RECORDS.INVENTORY_DETAIL.SUBLIST.id, fieldId: 'receiptinventorynumber', line: indexInvDet })
                            var invDetQty = inventoryDetail.getSublistValue({ sublistId: RECORDS.INVENTORY_DETAIL.SUBLIST.id, fieldId: 'quantity', line: indexInvDet })
                            arrInvDetail.push({ invDetNum, invDetQty });
                        }
                        console.log({ title: 'arrInvDetail', details: arrInvDetail });
                    }

                    if (arrInvDetail.length > 0) {
                        arrInvDetail.forEach(invDet => {
                            var newPedObj = Object.assign({}, pedObj)
                            newPedObj.noSerie = invDet.invDetNum
                            newPedObj.cantidad = invDet.invDetQty
                            array_pedimentoObj.push(newPedObj);
                        })
                    } else {
                        delete pedObj.noSerie
                        pedObj.cantidad = parseFloat(currentRecord.getCurrentSublistValue({ sublistId, fieldId: RECORDS.INVENTORY_ADJUSTMENT.SUBLIST.FIELDS.QUANTITY })) || '';
                        array_pedimentoObj.push(pedObj)
                    }
                } else {
                    return { action: true, linea: [] }
                }
                console.log({ title: 'array_pedimentoObj', details: array_pedimentoObj });
                return { action: (array_pedimentoObj.length > 0), linea: array_pedimentoObj }
            } catch (e) {
                console.error({ title: 'Error getDataLineIA:', details: e });
                return { action: false, linea: [] }
            }
        }
        // Creacion de Maestro de pedimentos
        const updatePedimento = (idMaster, condition, dataLine, typeMovement) => {
            try {
                log.debug({ title: 'IDs Maestro:', details: RECORDS.MASTER_PED });
                log.debug({ title: 'Datos para crear/actualizar maestro de pedimentos:', details: { idMaster: idMaster, condition, dataLine } });
                var masterPed = null;
                switch (condition) {
                    case 'create':
                        masterPed = record.create({ type: RECORDS.MASTER_PED.id, isDynamic: true });
                        masterPed.setValue({ fieldId: RECORDS.MASTER_PED.FIELDS.LOCATION, value: dataLine.location.value });
                        masterPed.setValue({ fieldId: RECORDS.MASTER_PED.FIELDS.ITEM, value: dataLine.item.value });
                        masterPed.setValue({ fieldId: RECORDS.MASTER_PED.FIELDS.NO_PEDIMENTO, value: dataLine.pedimento });
                        masterPed.setValue({ fieldId: RECORDS.MASTER_PED.FIELDS.QUANTITY_AVAILABLE, value: dataLine.cantidad });
                        masterPed.setValue({ fieldId: RECORDS.MASTER_PED.FIELDS.TOTAL_COST, value: dataLine.total });
                        masterPed.setValue({ fieldId: RECORDS.MASTER_PED.FIELDS.COST, value: dataLine.costo });
                        if (dataLine.hasOwnProperty('noSerie')) {
                            masterPed.setValue({ fieldId: RECORDS.MASTER_PED.FIELDS.SERIE_LOTE, value: dataLine.noSerie });
                        }
                        break;
                    case 'update':
                        masterPed = record.load({ type: RECORDS.MASTER_PED.id, id: idMaster, isDynamic: true });
                        const quantityAvailableMaster = Number(masterPed.getValue({ fieldId: RECORDS.MASTER_PED.FIELDS.QUANTITY_AVAILABLE }));
                        var cantidad = 0;
                        if (typeMovement === 'ingreso') {
                            cantidad = quantityAvailableMaster + (dataLine.actionUpdate * dataLine.difference);
                            masterPed.setValue({ fieldId: RECORDS.MASTER_PED.FIELDS.QUANTITY_AVAILABLE, value: cantidad });
                        } else if (typeMovement === 'consumo') {

                            if (dataLine.hasOwnProperty('actionUpdate')) {
                                cantidad = quantityAvailableMaster - (dataLine.actionUpdate * dataLine.difference);
                            } else {
                                var dataHist = Number((dataLine.historicId === '') ? dataLine.cantidad : search.lookupFields({ type: RECORDS.HISTORIC.id, id: dataLine.historicId, columns: [RECORDS.HISTORIC.FIELDS.QUANTITY] })[RECORDS.HISTORIC.FIELDS.QUANTITY]);
                                cantidad = quantityAvailableMaster - dataHist;
                            }
                            if (cantidad >= 0) {
                                masterPed.setValue({ fieldId: RECORDS.MASTER_PED.FIELDS.QUANTITY_AVAILABLE, value: cantidad });
                            }
                        }
                        log.debug({ title: 'dataHist', details: dataHist });
                        log.debug({ title: 'Cantidad actualizada', details: cantidad });
                        break;
                }

                const idMasterPed = masterPed.save({ enableSourcing: false, ignoreMandatoryFields: false })
                return idMasterPed;
            } catch (e) {
                log.error({ title: 'Error updatePedimento:', details: e });
                return -1
            }
        }
        // Creacion de Maestro de pedimentos
        const updateHistoric = (idMaster, dataLine) => {
            try {
                // log.debug({ title: 'IDs Historico:', details: RECORDS.HISTORIC });
                log.debug({ title: 'Datos para crear/actualizar el historial de pedimento:', details: { idMaster: idMaster, dataLine } });
                var historicPed = null;
                switch (dataLine.action) {
                    case 'create':
                        historicPed = record.create({ type: RECORDS.HISTORIC.id, isDynamic: true });
                        if (idMaster !== null) {
                            historicPed.setValue({ fieldId: RECORDS.HISTORIC.FIELDS.MASTER, value: idMaster });
                        }
                        historicPed.setValue({ fieldId: RECORDS.HISTORIC.FIELDS.TRAN_RELATED, value: dataLine.idTransaction });
                        historicPed.setValue({ fieldId: RECORDS.HISTORIC.FIELDS.LOCATION, value: dataLine.location.value });
                        historicPed.setValue({ fieldId: RECORDS.HISTORIC.FIELDS.ITEM, value: dataLine.item.value });
                        historicPed.setValue({ fieldId: RECORDS.HISTORIC.FIELDS.NO_PEDIMENTO, value: dataLine.pedimento });
                        historicPed.setValue({ fieldId: RECORDS.HISTORIC.FIELDS.QUANTITY, value: dataLine.cantidad });
                        historicPed.setValue({ fieldId: RECORDS.HISTORIC.FIELDS.VALUE_NEW, value: dataLine.cantidad });
                        if (dataLine.hasOwnProperty('noSerie')) {
                            historicPed.setValue({ fieldId: RECORDS.HISTORIC.FIELDS.SERIE_LOTE, value: dataLine.noSerie });
                        }
                        break;
                    case 'update':
                        historicPed = record.load({ type: RECORDS.HISTORIC.id, id: dataLine.historicId, isDynamic: true });
                        const quantityAvailableMaster = Number(historicPed.getValue({ fieldId: RECORDS.HISTORIC.FIELDS.QUANTITY })) || 0;
                        const cantidad = quantityAvailableMaster + (dataLine.actionUpdate * dataLine.difference)
                        log.debug({ title: 'Cantidad actualizada', details: cantidad });
                        if (quantityAvailableMaster !== cantidad) {
                            historicPed.setValue({ fieldId: RECORDS.HISTORIC.FIELDS.QUANTITY, value: dataLine.cantidad });
                            historicPed.setValue({ fieldId: RECORDS.HISTORIC.FIELDS.VALUE_NEW, value: dataLine.cantidad });
                            historicPed.setValue({ fieldId: RECORDS.HISTORIC.FIELDS.VALUE_PREV, value: quantityAvailableMaster });
                        }
                        break;
                }

                const idHistoricPed = historicPed.save({ enableSourcing: false, ignoreMandatoryFields: false })
                return idHistoricPed;
            } catch (e) {
                log.error({ title: 'Error updatePedimento:', details: e });
                return -1
            }
        }


        // Funciones para Client Script
        const createMessage = (objMsg) => {
            try {
                var showMsgCust = {
                    title: "",
                    message: '',
                    type: ''
                }
                switch (objMsg.status) {
                    case 'NOT_QTY':
                        showMsgCust.title = "Pedimentos"
                        showMsgCust.message = 'Por favor asegurese de que tenga stock disponible en sus pedimentos.' + objMsg.message
                        showMsgCust.type = message.Type.WARNING
                        break;
                    case 'NOT_NO_PED':
                        showMsgCust.title = "Debe ingresar el No. de pedimento"
                        // showMsgCust.message = 'Por favor asegurese de que tenga stock disponible en sus pedimentos.\nStock Disponible: ' + 'stok_total' + '.' + '\nCantidad solicitada en la transaccion: ' + 'suma_cantidad' + '. Se necesita un stock adicional de ' + 'falta' + ' unidades.'
                        showMsgCust.message = objMsg.message
                        showMsgCust.type = message.Type.WARNING
                        break;
                    case 'NOT_PED': // Error si se coloca el no. pedimento en el tipo de movimiento como salida
                        showMsgCust.title = "No debe colocar el No. de pedimento en un movimiento de salida"
                        showMsgCust.message = objMsg.message
                        showMsgCust.type = message.Type.WARNING
                        break;
                    case 'NOT_MOV_IN': // Error si se coloca el no. pedimento pero no el tipo de movimiento como entrada
                        showMsgCust.title = "Debe colocar el Tipo de movimiento como Entrada"
                        showMsgCust.message = objMsg.message
                        showMsgCust.type = message.Type.WARNING
                        break;
                    case 'NOT_NEGATIVO': // Error si ingresa valores negativos en la entrada
                        showMsgCust.title = "Debe ingresar solo valores positivos"
                        showMsgCust.message = objMsg.message
                        showMsgCust.type = message.Type.WARNING
                        break;
                    case 'NOT_POSITIVO': // Error si ingresa valores positivos en la salida
                        showMsgCust.title = "Debe ingresar solo valores negativos"
                        showMsgCust.message = objMsg.message
                        showMsgCust.type = message.Type.WARNING
                        break;
                    case 'ERROR':
                        showMsgCust.title = "ERROR Script"
                        showMsgCust.message = 'Error script: ' + objMsg.e
                        showMsgCust.type = message.Type.ERROR
                        break;
                    default:
                        showMsgCust.title = "Error no identificado."
                        showMsgCust.message = 'Consulte a su administrador'
                        showMsgCust.type = message.Type.ERROR
                        break;
                }
                var myMsg = message.create(showMsgCust);
                myMsg.show();
            } catch (e) {
                console.error({ title: 'Error createMessage:', details: e });
            }
        }
        return { getDataToSS, getInfoToTransaction, getInfoToTransactionIF, getInfoToTransactionIA, validateToUpdate, bloques, updatePedimento, updateHistoric, getDataLine, getDataLineIA, createMessage }
    });