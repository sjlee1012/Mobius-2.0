const responder = require("./mobius/responder");


const resultStatusCode = {
    '301-3': ['405', '4005', "forwarding with mqtt is not supported"],
    '301-4': ['405', '4005', "protocol in poa of csr is not supported"],

    '400-1': ['400', '4000', "BAD REQUEST: X-M2M-RI is none"],
    '400-2': ['400', '4000', "BAD REQUEST: X-M2M-Origin header is Mandatory"],
    '400-3': ['400', '4000', "BAD REQUEST: not supported resource type requested"],
    '400-4': ['400', '4000', "BAD REQUEST: not parse your body"],
    '400-5': ['400', '4000', "BAD REQUEST: [parse_to_json] do not parse xml body"],
    '400-6': ['400', '4000', "BAD REQUEST: [parse_to_json] do not parse cbor body"],
    '400-7': ['400', '4000', "BAD REQUEST: [parse_to_json] root tag of body is not matched"],
    '400-8': ['400', '4000', "BAD REQUEST: (aa, at, poa, acpi, srt, nu, mid, macp, rels, rqps, srv) attribute should be json array format"],
    '400-9': ['400', '4000', "BAD REQUEST: (lbl) attribute should be json array format"],
    '400-10': ['400', '4000', "BAD REQUEST: (enc.net) attribute should be json array format"],
    '400-11': ['400', '4000', "BAD REQUEST: (enc) attribute should have net key as child in json format"],
    '400-12': ['400', '4000', "BAD REQUEST: (pv.acr, pvs.acr) attribute should be json array format"],
    '400-13': ['400', '4000', "BAD REQUEST: (pv.acr.acor, pvs.acr.acor) attribute should be json array format"],
    '400-14': ['400', '4000', "BAD REQUEST: (pv.acr.acco, pvs.acr.acco) attribute should be json array format"],
    '400-15': ['400', '4000', "BAD REQUEST: (pv.acr.acco.acip.ipv4, pvs.acr.acco.acip.ipv4) attribute should be json array format"],
    '400-16': ['400', '4000', "BAD REQUEST: (pv.acr.acco.acip.ipv6, pvs.acr.acco.acip.ipv6) attribute should be json array format"],
    '400-17': ['400', '4000', "BAD REQUEST: (pv.acr.acco.actw, pvs.acr.acco.actw) attribute should be json array format"],
    '400-18': ['400', '4000', "BAD REQUEST: (uds, cas) attribute should be json array format"],
    '400-19': ['400', '4000', "BAD REQUEST: [check_notification] post request without ty value is but body is not for notification"],
    '400-20': ['400', '4000', "BAD REQUEST: [check_notification] content-type is none"],
    '400-21': ['400', '4000', "BAD REQUEST: X-M2M-RTU is none"],
    '400-22': ['400', '4000', "BAD REQUEST: \'Not Present\' attribute"],
    '400-23': ['400', '4000', "BAD REQUEST: .acr must have values"],
    '400-24': ['400', '4000', "BAD REQUEST: nu must have values"],
    '400-25': ['400', '4000', "BAD REQUEST: attribute is not defined"],
    '400-26': ['400', '4000', "BAD REQUEST: attribute is \'Mandatory\' attribute"],
    '400-27': ['400', '4000', "BAD REQUEST: expiration time is before now"],
    '400-28': ['400', '4000', "BAD REQUEST: ASN CSE can not have child CSE (remoteCSE)"],
    '400-29': ['400', '4000', "BAD REQUEST: mni is negative value"],
    '400-30': ['400', '4000', "BAD REQUEST: mbs is negative valuee"],
    '400-31': ['400', '4000', "BAD REQUEST: mia is negative value"],
    '400-32': ['400', '4000', "BAD REQUEST: contentInfo(cnf) format is not match"],
    '400-33': ['400', '6010', "MAX_NUMBER_OF_MEMBER_EXCEEDED"],
    '400-34': ['400', '6011', "can not create group because csy is ABANDON_GROUP when MEMBER_TYPE_INCONSISTENT"],
    '400-35': ['400', '4000', "BAD REQUEST: mgmtDefinition is not match with mgmtObj resource"],
    '400-36': ['400', '4000', "BAD REQUEST: ty does not supported"],
    '400-37': ['400', '4000', "BAD REQUEST: transaction resource could not create"],
    '400-40': ['400', '4000', "BAD REQUEST: body is empty"],
    '400-41': ['400', '4000', "BAD REQUEST"],
    '400-42': ['400', '4000', "BAD REQUEST: ty is different with body"],
    '400-43': ['400', '4000', "BAD REQUEST: rcn or fu query is not supported at POST request"],
    '400-44': ['400', '4000', "BAD REQUEST: rcn or fu query is not supported at GET request"],
    '400-45': ['400', '4000', "BAD REQUEST: rcn or fu query is not supported at PUT request"],
    '400-46': ['400', '4000', "BAD REQUEST: rcn or fu query is not supported at DELETE request"],
    '400-47': ['400', '4000', "BAD REQUEST: protocol in poa of ae is not supported"],
    '400-50': ['400', '4000', "BAD REQUEST: state of transaction is mismatch"],
    '400-51': ['400', '4000', "BAD REQUEST: mgmtObj requested is not match with content type of body"],
    '400-52': ['400', '4000', "BAD REQUEST: ty does not supported"],
    '400-53': ['400', '4000', "BAD REQUEST: this resource of mgmtObj is not supported"],
    '400-54': ['400', '4000', "BAD REQUEST: cdn of flexCotainer is not match with fcnt resource"],

    '403-1': ['403', '4107', "OPERATION_NOT_ALLOWED: AE-ID is not allowed"],
    '403-2': ['403', '5203', "TARGET_NOT_SUBSCRIBABLE: request ty creating can not create under parent resource"],
    '403-3': ['403', '4103', "ACCESS DENIED"],
    '403-4': ['403', '4107', "OPERATION_NOT_ALLOWED: APP-ID in AE is not allowed"],
    '403-5': ['403', '4107', "[app.use] ACCESS DENIED (fopt)"],
    '403-6': ['403', '4109', "NO_MEMBERS: memberID in parent group is empty"],

    '404-1': ['404', '4004', "resource does not exist (get_target_url)"],
    '404-2': ['404', '4004', "RESOURCE DOES NOT FOUND"],
    '404-3': ['404', '4004', "csebase is not found"],
    '404-4': ['404', '4004', "group resource does not exist"],
    '404-5': ['404', '4004', "response is not from fanOutPoint"],
    '404-6': ['404', '4004', "AE for notify is not found"],
    '404-7': ['404', '4004', "AE for notify does not exist"],

    '405-1': ['405', '4005', "OPERATION_NOT_ALLOWED: CSEBase can not be created by others"],
    '405-2': ['405', '4005', "OPERATION_NOT_ALLOWED: req is not supported when post request"],
    '405-3': ['405', '4005', "OPERATION_NOT_ALLOWED: we do not support resource type requested"],
    '405-4': ['405', '4005', "OPERATION_NOT_ALLOWED: rt query is not supported"],
    '405-5': ['405', '4005', "OPERATION_NOT_ALLOWED: we do not support to create resource"],
    '405-6': ['405', '4005', "OPERATION NOT ALLOWED: disr attribute is true"],
    '405-7': ['405', '4005', "OPERATION NOT ALLOWED: Update cin is not supported"],
    '405-8': ['405', '4005', "OPERATION NOT ALLOWED: req is not supported when put request"],
    '405-9': ['405', '4005', "OPERATION_NOT_ALLOWED: csebase is not supported when put request"],
    '405-10': ['405', '4005', "OPERATION_NOT_ALLOWED: notification with mqtt is not supported"],
    '405-11': ['405', '4005', "OPERATION_NOT_ALLOWED: notification with ws is not supported"],
    '405-12': ['405', '4005', "OPERATION_NOT_ALLOWED: notification with coap is not supported"],

    '406-1': ['406', '5207', "NOT_ACCEPTABLE: can not create cin because mni value is zero"],
    '406-2': ['406', '5207', "NOT_ACCEPTABLE: can not create cin because mbs value is zero"],
    '406-3': ['406', '5207', "NOT_ACCEPTABLE: cs is exceed mbs"],

    '409-1': ['409', '4005', "can not use post, put method at latest resource"],
    '409-2': ['409', '4005', "can not use post, put method at oldest resource"],
    '409-3': ['409', '4005', "resource name can not use that is keyword"],
    '409-4': ['409', '4005', "resource requested is not supported"],
    '409-5': ['409', '4105', "resource is already exist"],
    '409-6': ['409', '4005', "[create_action] aei is duplicated"],

    '423-1': ['423', '4230', "LOCKED: this resource was occupied by others"],

    '500-1': ['500', '5000', "database error"],
    '500-2': ['500', '5204', "SUBSCRIPTION_VERIFICATION_INITIATION_FAILED"],
    '500-4': ['500', '5000', "[create_action] create resource error"],
    '500-5': ['500', '5000', "DB Error : No Connection Pool"],

    '501-1': ['501', '5001', "response with hierarchical resource structure mentioned in onem2m spec is not supported instead all the requested resources will be returned !"]

};

function response_error_result(request, response, code, callback) {
    responder.error_result(request, response, resultStatusCode[code][0], resultStatusCode[code][1], resultStatusCode[code][2], () => {
        callback();
    });
}

//////////////////////////////////////////////////////////
// module exports

module.exports = {
    response_error_result
};
