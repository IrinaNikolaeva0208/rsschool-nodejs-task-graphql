const uuidRegEx = /[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}/;
export default function isUUID (id: string) {
  return id.match(uuidRegEx) && id.length == 36;
}