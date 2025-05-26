// node_modules/@google/genai/dist/web/index.mjs
var BaseModule = class {
};
function formatMap(templateString, valueMap) {
  const regex = /\{([^}]+)\}/g;
  return templateString.replace(regex, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(valueMap, key)) {
      const value = valueMap[key];
      return value !== void 0 && value !== null ? String(value) : "";
    } else {
      throw new Error(`Key '${key}' not found in valueMap.`);
    }
  });
}
function setValueByPath(data, keys, value) {
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (key.endsWith("[]")) {
      const keyName = key.slice(0, -2);
      if (!(keyName in data)) {
        if (Array.isArray(value)) {
          data[keyName] = Array.from({ length: value.length }, () => ({}));
        } else {
          throw new Error(`Value must be a list given an array path ${key}`);
        }
      }
      if (Array.isArray(data[keyName])) {
        const arrayData = data[keyName];
        if (Array.isArray(value)) {
          for (let j = 0; j < arrayData.length; j++) {
            const entry = arrayData[j];
            setValueByPath(entry, keys.slice(i + 1), value[j]);
          }
        } else {
          for (const d of arrayData) {
            setValueByPath(d, keys.slice(i + 1), value);
          }
        }
      }
      return;
    } else if (key.endsWith("[0]")) {
      const keyName = key.slice(0, -3);
      if (!(keyName in data)) {
        data[keyName] = [{}];
      }
      const arrayData = data[keyName];
      setValueByPath(arrayData[0], keys.slice(i + 1), value);
      return;
    }
    if (!data[key] || typeof data[key] !== "object") {
      data[key] = {};
    }
    data = data[key];
  }
  const keyToSet = keys[keys.length - 1];
  const existingData = data[keyToSet];
  if (existingData !== void 0) {
    if (!value || typeof value === "object" && Object.keys(value).length === 0) {
      return;
    }
    if (value === existingData) {
      return;
    }
    if (typeof existingData === "object" && typeof value === "object" && existingData !== null && value !== null) {
      Object.assign(existingData, value);
    } else {
      throw new Error(`Cannot set value for an existing key. Key: ${keyToSet}`);
    }
  } else {
    data[keyToSet] = value;
  }
}
function getValueByPath(data, keys) {
  try {
    if (keys.length === 1 && keys[0] === "_self") {
      return data;
    }
    for (let i = 0; i < keys.length; i++) {
      if (typeof data !== "object" || data === null) {
        return void 0;
      }
      const key = keys[i];
      if (key.endsWith("[]")) {
        const keyName = key.slice(0, -2);
        if (keyName in data) {
          const arrayData = data[keyName];
          if (!Array.isArray(arrayData)) {
            return void 0;
          }
          return arrayData.map((d) => getValueByPath(d, keys.slice(i + 1)));
        } else {
          return void 0;
        }
      } else {
        data = data[key];
      }
    }
    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      return void 0;
    }
    throw error;
  }
}
function tModel(apiClient, model) {
  if (!model || typeof model !== "string") {
    throw new Error("model is required and must be a string");
  }
  if (apiClient.isVertexAI()) {
    if (model.startsWith("publishers/") || model.startsWith("projects/") || model.startsWith("models/")) {
      return model;
    } else if (model.indexOf("/") >= 0) {
      const parts = model.split("/", 2);
      return `publishers/${parts[0]}/models/${parts[1]}`;
    } else {
      return `publishers/google/models/${model}`;
    }
  } else {
    if (model.startsWith("models/") || model.startsWith("tunedModels/")) {
      return model;
    } else {
      return `models/${model}`;
    }
  }
}
function tCachesModel(apiClient, model) {
  const transformedModel = tModel(apiClient, model);
  if (!transformedModel) {
    return "";
  }
  if (transformedModel.startsWith("publishers/") && apiClient.isVertexAI()) {
    return `projects/${apiClient.getProject()}/locations/${apiClient.getLocation()}/${transformedModel}`;
  } else if (transformedModel.startsWith("models/") && apiClient.isVertexAI()) {
    return `projects/${apiClient.getProject()}/locations/${apiClient.getLocation()}/publishers/google/${transformedModel}`;
  } else {
    return transformedModel;
  }
}
function tPart(apiClient, origin) {
  if (origin === null || origin === void 0) {
    throw new Error("PartUnion is required");
  }
  if (typeof origin === "object") {
    return origin;
  }
  if (typeof origin === "string") {
    return { text: origin };
  }
  throw new Error(`Unsupported part type: ${typeof origin}`);
}
function tParts(apiClient, origin) {
  if (origin === null || origin === void 0 || Array.isArray(origin) && origin.length === 0) {
    throw new Error("PartListUnion is required");
  }
  if (Array.isArray(origin)) {
    return origin.map((item) => tPart(apiClient, item));
  }
  return [tPart(apiClient, origin)];
}
function _isContent(origin) {
  return origin !== null && origin !== void 0 && typeof origin === "object" && "parts" in origin && Array.isArray(origin.parts);
}
function _isFunctionCallPart(origin) {
  return origin !== null && origin !== void 0 && typeof origin === "object" && "functionCall" in origin;
}
function _isUserPart(origin) {
  if (origin === null || origin === void 0) {
    return false;
  }
  if (_isFunctionCallPart(origin)) {
    return false;
  }
  return true;
}
function _areUserParts(origin) {
  if (origin === null || origin === void 0 || Array.isArray(origin) && origin.length === 0) {
    return false;
  }
  return origin.every(_isUserPart);
}
function tContent(apiClient, origin) {
  if (origin === null || origin === void 0) {
    throw new Error("ContentUnion is required");
  }
  if (_isContent(origin)) {
    return origin;
  }
  if (_isUserPart(origin)) {
    return {
      role: "user",
      parts: tParts(apiClient, origin)
    };
  } else {
    return {
      role: "model",
      parts: tParts(apiClient, origin)
    };
  }
}
function tContentsForEmbed(apiClient, origin) {
  if (!origin) {
    return [];
  }
  if (apiClient.isVertexAI() && Array.isArray(origin)) {
    return origin.flatMap((item) => {
      const content = tContent(apiClient, item);
      if (content.parts && content.parts.length > 0 && content.parts[0].text !== void 0) {
        return [content.parts[0].text];
      }
      return [];
    });
  } else if (apiClient.isVertexAI()) {
    const content = tContent(apiClient, origin);
    if (content.parts && content.parts.length > 0 && content.parts[0].text !== void 0) {
      return [content.parts[0].text];
    }
    return [];
  }
  if (Array.isArray(origin)) {
    return origin.map((item) => tContent(apiClient, item));
  }
  return [tContent(apiClient, origin)];
}
function _appendAccumulatedPartsAsContent(apiClient, result, accumulatedParts) {
  if (accumulatedParts.length === 0) {
    return;
  }
  if (_areUserParts(accumulatedParts)) {
    result.push({
      role: "user",
      parts: tParts(apiClient, accumulatedParts)
    });
  } else {
    result.push({
      role: "model",
      parts: tParts(apiClient, accumulatedParts)
    });
  }
  accumulatedParts.length = 0;
}
function _handleCurrentPart(apiClient, result, accumulatedParts, currentPart) {
  if (_isUserPart(currentPart) === _areUserParts(accumulatedParts)) {
    accumulatedParts.push(currentPart);
  } else {
    _appendAccumulatedPartsAsContent(apiClient, result, accumulatedParts);
    accumulatedParts.length = 0;
    accumulatedParts.push(currentPart);
  }
}
function tContents(apiClient, origin) {
  if (origin === null || origin === void 0 || Array.isArray(origin) && origin.length === 0) {
    throw new Error("contents are required");
  }
  if (!Array.isArray(origin)) {
    return [tContent(apiClient, origin)];
  }
  const result = [];
  const accumulatedParts = [];
  for (const content of origin) {
    if (_isContent(content)) {
      _appendAccumulatedPartsAsContent(apiClient, result, accumulatedParts);
      result.push(content);
    } else if (typeof content === "string" || typeof content === "object" && !Array.isArray(content)) {
      _handleCurrentPart(apiClient, result, accumulatedParts, content);
    } else if (Array.isArray(content)) {
      _appendAccumulatedPartsAsContent(apiClient, result, accumulatedParts);
      result.push({
        role: "user",
        parts: tParts(apiClient, content)
      });
    } else {
      throw new Error(`Unsupported content type: ${typeof content}`);
    }
  }
  _appendAccumulatedPartsAsContent(apiClient, result, accumulatedParts);
  return result;
}
function processSchema(apiClient, schema) {
  if (!apiClient.isVertexAI()) {
    if ("default" in schema) {
      throw new Error("Default value is not supported in the response schema for the Gemini API.");
    }
  }
  if ("anyOf" in schema) {
    if (schema["anyOf"] !== void 0) {
      for (const subSchema of schema["anyOf"]) {
        processSchema(apiClient, subSchema);
      }
    }
  }
  if ("items" in schema) {
    if (schema["items"] !== void 0) {
      processSchema(apiClient, schema["items"]);
    }
  }
  if ("properties" in schema) {
    if (schema["properties"] !== void 0) {
      for (const subSchema of Object.values(schema["properties"])) {
        processSchema(apiClient, subSchema);
      }
    }
  }
}
function tSchema(apiClient, schema) {
  processSchema(apiClient, schema);
  return schema;
}
function tSpeechConfig(apiClient, speechConfig) {
  if (typeof speechConfig === "object" && "voiceConfig" in speechConfig) {
    return speechConfig;
  } else if (typeof speechConfig === "string") {
    return {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: speechConfig
        }
      }
    };
  } else {
    throw new Error(`Unsupported speechConfig type: ${typeof speechConfig}`);
  }
}
function tTool(apiClient, tool) {
  return tool;
}
function tTools(apiClient, tool) {
  if (!Array.isArray(tool)) {
    throw new Error("tool is required and must be an array of Tools");
  }
  return tool;
}
function resourceName(client, resourceName2, resourcePrefix, splitsAfterPrefix = 1) {
  const shouldAppendPrefix = !resourceName2.startsWith(`${resourcePrefix}/`) && resourceName2.split("/").length === splitsAfterPrefix;
  if (client.isVertexAI()) {
    if (resourceName2.startsWith("projects/")) {
      return resourceName2;
    } else if (resourceName2.startsWith("locations/")) {
      return `projects/${client.getProject()}/${resourceName2}`;
    } else if (resourceName2.startsWith(`${resourcePrefix}/`)) {
      return `projects/${client.getProject()}/locations/${client.getLocation()}/${resourceName2}`;
    } else if (shouldAppendPrefix) {
      return `projects/${client.getProject()}/locations/${client.getLocation()}/${resourcePrefix}/${resourceName2}`;
    } else {
      return resourceName2;
    }
  }
  if (shouldAppendPrefix) {
    return `${resourcePrefix}/${resourceName2}`;
  }
  return resourceName2;
}
function tCachedContentName(apiClient, name) {
  if (typeof name !== "string") {
    throw new Error("name must be a string");
  }
  return resourceName(apiClient, name, "cachedContents");
}
function tBytes(apiClient, fromImageBytes) {
  if (typeof fromImageBytes !== "string") {
    throw new Error("fromImageBytes must be a string");
  }
  return fromImageBytes;
}
function tFileName(apiClient, fromName) {
  if (typeof fromName !== "string") {
    throw new Error("fromName must be a string");
  }
  if (fromName.startsWith("files/")) {
    return fromName.split("files/")[1];
  }
  return fromName;
}
function partToMldev$1(apiClient, fromObject) {
  const toObject = {};
  if (getValueByPath(fromObject, ["videoMetadata"]) !== void 0) {
    throw new Error("videoMetadata parameter is not supported in Gemini API.");
  }
  const fromThought = getValueByPath(fromObject, ["thought"]);
  if (fromThought != null) {
    setValueByPath(toObject, ["thought"], fromThought);
  }
  const fromCodeExecutionResult = getValueByPath(fromObject, [
    "codeExecutionResult"
  ]);
  if (fromCodeExecutionResult != null) {
    setValueByPath(toObject, ["codeExecutionResult"], fromCodeExecutionResult);
  }
  const fromExecutableCode = getValueByPath(fromObject, [
    "executableCode"
  ]);
  if (fromExecutableCode != null) {
    setValueByPath(toObject, ["executableCode"], fromExecutableCode);
  }
  const fromFileData = getValueByPath(fromObject, ["fileData"]);
  if (fromFileData != null) {
    setValueByPath(toObject, ["fileData"], fromFileData);
  }
  const fromFunctionCall = getValueByPath(fromObject, ["functionCall"]);
  if (fromFunctionCall != null) {
    setValueByPath(toObject, ["functionCall"], fromFunctionCall);
  }
  const fromFunctionResponse = getValueByPath(fromObject, [
    "functionResponse"
  ]);
  if (fromFunctionResponse != null) {
    setValueByPath(toObject, ["functionResponse"], fromFunctionResponse);
  }
  const fromInlineData = getValueByPath(fromObject, ["inlineData"]);
  if (fromInlineData != null) {
    setValueByPath(toObject, ["inlineData"], fromInlineData);
  }
  const fromText = getValueByPath(fromObject, ["text"]);
  if (fromText != null) {
    setValueByPath(toObject, ["text"], fromText);
  }
  return toObject;
}
function contentToMldev$1(apiClient, fromObject) {
  const toObject = {};
  const fromParts = getValueByPath(fromObject, ["parts"]);
  if (fromParts != null) {
    if (Array.isArray(fromParts)) {
      setValueByPath(toObject, ["parts"], fromParts.map((item) => {
        return partToMldev$1(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["parts"], fromParts);
    }
  }
  const fromRole = getValueByPath(fromObject, ["role"]);
  if (fromRole != null) {
    setValueByPath(toObject, ["role"], fromRole);
  }
  return toObject;
}
function functionDeclarationToMldev$1(apiClient, fromObject) {
  const toObject = {};
  if (getValueByPath(fromObject, ["response"]) !== void 0) {
    throw new Error("response parameter is not supported in Gemini API.");
  }
  const fromDescription = getValueByPath(fromObject, ["description"]);
  if (fromDescription != null) {
    setValueByPath(toObject, ["description"], fromDescription);
  }
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName != null) {
    setValueByPath(toObject, ["name"], fromName);
  }
  const fromParameters = getValueByPath(fromObject, ["parameters"]);
  if (fromParameters != null) {
    setValueByPath(toObject, ["parameters"], fromParameters);
  }
  return toObject;
}
function googleSearchToMldev$1() {
  const toObject = {};
  return toObject;
}
function dynamicRetrievalConfigToMldev$1(apiClient, fromObject) {
  const toObject = {};
  const fromMode = getValueByPath(fromObject, ["mode"]);
  if (fromMode != null) {
    setValueByPath(toObject, ["mode"], fromMode);
  }
  const fromDynamicThreshold = getValueByPath(fromObject, [
    "dynamicThreshold"
  ]);
  if (fromDynamicThreshold != null) {
    setValueByPath(toObject, ["dynamicThreshold"], fromDynamicThreshold);
  }
  return toObject;
}
function googleSearchRetrievalToMldev$1(apiClient, fromObject) {
  const toObject = {};
  const fromDynamicRetrievalConfig = getValueByPath(fromObject, [
    "dynamicRetrievalConfig"
  ]);
  if (fromDynamicRetrievalConfig != null) {
    setValueByPath(toObject, ["dynamicRetrievalConfig"], dynamicRetrievalConfigToMldev$1(apiClient, fromDynamicRetrievalConfig));
  }
  return toObject;
}
function toolToMldev$1(apiClient, fromObject) {
  const toObject = {};
  const fromFunctionDeclarations = getValueByPath(fromObject, [
    "functionDeclarations"
  ]);
  if (fromFunctionDeclarations != null) {
    if (Array.isArray(fromFunctionDeclarations)) {
      setValueByPath(toObject, ["functionDeclarations"], fromFunctionDeclarations.map((item) => {
        return functionDeclarationToMldev$1(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["functionDeclarations"], fromFunctionDeclarations);
    }
  }
  if (getValueByPath(fromObject, ["retrieval"]) !== void 0) {
    throw new Error("retrieval parameter is not supported in Gemini API.");
  }
  const fromGoogleSearch = getValueByPath(fromObject, ["googleSearch"]);
  if (fromGoogleSearch != null) {
    setValueByPath(toObject, ["googleSearch"], googleSearchToMldev$1());
  }
  const fromGoogleSearchRetrieval = getValueByPath(fromObject, [
    "googleSearchRetrieval"
  ]);
  if (fromGoogleSearchRetrieval != null) {
    setValueByPath(toObject, ["googleSearchRetrieval"], googleSearchRetrievalToMldev$1(apiClient, fromGoogleSearchRetrieval));
  }
  const fromCodeExecution = getValueByPath(fromObject, [
    "codeExecution"
  ]);
  if (fromCodeExecution != null) {
    setValueByPath(toObject, ["codeExecution"], fromCodeExecution);
  }
  return toObject;
}
function functionCallingConfigToMldev$1(apiClient, fromObject) {
  const toObject = {};
  const fromMode = getValueByPath(fromObject, ["mode"]);
  if (fromMode != null) {
    setValueByPath(toObject, ["mode"], fromMode);
  }
  const fromAllowedFunctionNames = getValueByPath(fromObject, [
    "allowedFunctionNames"
  ]);
  if (fromAllowedFunctionNames != null) {
    setValueByPath(toObject, ["allowedFunctionNames"], fromAllowedFunctionNames);
  }
  return toObject;
}
function toolConfigToMldev$1(apiClient, fromObject) {
  const toObject = {};
  const fromFunctionCallingConfig = getValueByPath(fromObject, [
    "functionCallingConfig"
  ]);
  if (fromFunctionCallingConfig != null) {
    setValueByPath(toObject, ["functionCallingConfig"], functionCallingConfigToMldev$1(apiClient, fromFunctionCallingConfig));
  }
  return toObject;
}
function createCachedContentConfigToMldev(apiClient, fromObject, parentObject) {
  const toObject = {};
  const fromTtl = getValueByPath(fromObject, ["ttl"]);
  if (parentObject !== void 0 && fromTtl != null) {
    setValueByPath(parentObject, ["ttl"], fromTtl);
  }
  const fromExpireTime = getValueByPath(fromObject, ["expireTime"]);
  if (parentObject !== void 0 && fromExpireTime != null) {
    setValueByPath(parentObject, ["expireTime"], fromExpireTime);
  }
  const fromDisplayName = getValueByPath(fromObject, ["displayName"]);
  if (parentObject !== void 0 && fromDisplayName != null) {
    setValueByPath(parentObject, ["displayName"], fromDisplayName);
  }
  const fromContents = getValueByPath(fromObject, ["contents"]);
  if (parentObject !== void 0 && fromContents != null) {
    if (Array.isArray(fromContents)) {
      setValueByPath(parentObject, ["contents"], tContents(apiClient, tContents(apiClient, fromContents).map((item) => {
        return contentToMldev$1(apiClient, item);
      })));
    } else {
      setValueByPath(parentObject, ["contents"], tContents(apiClient, fromContents));
    }
  }
  const fromSystemInstruction = getValueByPath(fromObject, [
    "systemInstruction"
  ]);
  if (parentObject !== void 0 && fromSystemInstruction != null) {
    setValueByPath(parentObject, ["systemInstruction"], contentToMldev$1(apiClient, tContent(apiClient, fromSystemInstruction)));
  }
  const fromTools = getValueByPath(fromObject, ["tools"]);
  if (parentObject !== void 0 && fromTools != null) {
    if (Array.isArray(fromTools)) {
      setValueByPath(parentObject, ["tools"], fromTools.map((item) => {
        return toolToMldev$1(apiClient, item);
      }));
    } else {
      setValueByPath(parentObject, ["tools"], fromTools);
    }
  }
  const fromToolConfig = getValueByPath(fromObject, ["toolConfig"]);
  if (parentObject !== void 0 && fromToolConfig != null) {
    setValueByPath(parentObject, ["toolConfig"], toolConfigToMldev$1(apiClient, fromToolConfig));
  }
  return toObject;
}
function createCachedContentParametersToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromModel = getValueByPath(fromObject, ["model"]);
  if (fromModel != null) {
    setValueByPath(toObject, ["model"], tCachesModel(apiClient, fromModel));
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], createCachedContentConfigToMldev(apiClient, fromConfig, toObject));
  }
  return toObject;
}
function getCachedContentParametersToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName != null) {
    setValueByPath(toObject, ["_url", "name"], tCachedContentName(apiClient, fromName));
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], fromConfig);
  }
  return toObject;
}
function deleteCachedContentParametersToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName != null) {
    setValueByPath(toObject, ["_url", "name"], tCachedContentName(apiClient, fromName));
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], fromConfig);
  }
  return toObject;
}
function updateCachedContentConfigToMldev(apiClient, fromObject, parentObject) {
  const toObject = {};
  const fromTtl = getValueByPath(fromObject, ["ttl"]);
  if (parentObject !== void 0 && fromTtl != null) {
    setValueByPath(parentObject, ["ttl"], fromTtl);
  }
  const fromExpireTime = getValueByPath(fromObject, ["expireTime"]);
  if (parentObject !== void 0 && fromExpireTime != null) {
    setValueByPath(parentObject, ["expireTime"], fromExpireTime);
  }
  return toObject;
}
function updateCachedContentParametersToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName != null) {
    setValueByPath(toObject, ["_url", "name"], tCachedContentName(apiClient, fromName));
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], updateCachedContentConfigToMldev(apiClient, fromConfig, toObject));
  }
  return toObject;
}
function listCachedContentsConfigToMldev(apiClient, fromObject, parentObject) {
  const toObject = {};
  const fromPageSize = getValueByPath(fromObject, ["pageSize"]);
  if (parentObject !== void 0 && fromPageSize != null) {
    setValueByPath(parentObject, ["_query", "pageSize"], fromPageSize);
  }
  const fromPageToken = getValueByPath(fromObject, ["pageToken"]);
  if (parentObject !== void 0 && fromPageToken != null) {
    setValueByPath(parentObject, ["_query", "pageToken"], fromPageToken);
  }
  return toObject;
}
function listCachedContentsParametersToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], listCachedContentsConfigToMldev(apiClient, fromConfig, toObject));
  }
  return toObject;
}
function partToVertex$1(apiClient, fromObject) {
  const toObject = {};
  const fromVideoMetadata = getValueByPath(fromObject, [
    "videoMetadata"
  ]);
  if (fromVideoMetadata != null) {
    setValueByPath(toObject, ["videoMetadata"], fromVideoMetadata);
  }
  const fromThought = getValueByPath(fromObject, ["thought"]);
  if (fromThought != null) {
    setValueByPath(toObject, ["thought"], fromThought);
  }
  const fromCodeExecutionResult = getValueByPath(fromObject, [
    "codeExecutionResult"
  ]);
  if (fromCodeExecutionResult != null) {
    setValueByPath(toObject, ["codeExecutionResult"], fromCodeExecutionResult);
  }
  const fromExecutableCode = getValueByPath(fromObject, [
    "executableCode"
  ]);
  if (fromExecutableCode != null) {
    setValueByPath(toObject, ["executableCode"], fromExecutableCode);
  }
  const fromFileData = getValueByPath(fromObject, ["fileData"]);
  if (fromFileData != null) {
    setValueByPath(toObject, ["fileData"], fromFileData);
  }
  const fromFunctionCall = getValueByPath(fromObject, ["functionCall"]);
  if (fromFunctionCall != null) {
    setValueByPath(toObject, ["functionCall"], fromFunctionCall);
  }
  const fromFunctionResponse = getValueByPath(fromObject, [
    "functionResponse"
  ]);
  if (fromFunctionResponse != null) {
    setValueByPath(toObject, ["functionResponse"], fromFunctionResponse);
  }
  const fromInlineData = getValueByPath(fromObject, ["inlineData"]);
  if (fromInlineData != null) {
    setValueByPath(toObject, ["inlineData"], fromInlineData);
  }
  const fromText = getValueByPath(fromObject, ["text"]);
  if (fromText != null) {
    setValueByPath(toObject, ["text"], fromText);
  }
  return toObject;
}
function contentToVertex$1(apiClient, fromObject) {
  const toObject = {};
  const fromParts = getValueByPath(fromObject, ["parts"]);
  if (fromParts != null) {
    if (Array.isArray(fromParts)) {
      setValueByPath(toObject, ["parts"], fromParts.map((item) => {
        return partToVertex$1(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["parts"], fromParts);
    }
  }
  const fromRole = getValueByPath(fromObject, ["role"]);
  if (fromRole != null) {
    setValueByPath(toObject, ["role"], fromRole);
  }
  return toObject;
}
function schemaToVertex$1(apiClient, fromObject) {
  const toObject = {};
  const fromExample = getValueByPath(fromObject, ["example"]);
  if (fromExample != null) {
    setValueByPath(toObject, ["example"], fromExample);
  }
  const fromPattern = getValueByPath(fromObject, ["pattern"]);
  if (fromPattern != null) {
    setValueByPath(toObject, ["pattern"], fromPattern);
  }
  const fromDefault = getValueByPath(fromObject, ["default"]);
  if (fromDefault != null) {
    setValueByPath(toObject, ["default"], fromDefault);
  }
  const fromMaxLength = getValueByPath(fromObject, ["maxLength"]);
  if (fromMaxLength != null) {
    setValueByPath(toObject, ["maxLength"], fromMaxLength);
  }
  const fromMinLength = getValueByPath(fromObject, ["minLength"]);
  if (fromMinLength != null) {
    setValueByPath(toObject, ["minLength"], fromMinLength);
  }
  const fromMinProperties = getValueByPath(fromObject, [
    "minProperties"
  ]);
  if (fromMinProperties != null) {
    setValueByPath(toObject, ["minProperties"], fromMinProperties);
  }
  const fromMaxProperties = getValueByPath(fromObject, [
    "maxProperties"
  ]);
  if (fromMaxProperties != null) {
    setValueByPath(toObject, ["maxProperties"], fromMaxProperties);
  }
  const fromAnyOf = getValueByPath(fromObject, ["anyOf"]);
  if (fromAnyOf != null) {
    setValueByPath(toObject, ["anyOf"], fromAnyOf);
  }
  const fromDescription = getValueByPath(fromObject, ["description"]);
  if (fromDescription != null) {
    setValueByPath(toObject, ["description"], fromDescription);
  }
  const fromEnum = getValueByPath(fromObject, ["enum"]);
  if (fromEnum != null) {
    setValueByPath(toObject, ["enum"], fromEnum);
  }
  const fromFormat = getValueByPath(fromObject, ["format"]);
  if (fromFormat != null) {
    setValueByPath(toObject, ["format"], fromFormat);
  }
  const fromItems = getValueByPath(fromObject, ["items"]);
  if (fromItems != null) {
    setValueByPath(toObject, ["items"], fromItems);
  }
  const fromMaxItems = getValueByPath(fromObject, ["maxItems"]);
  if (fromMaxItems != null) {
    setValueByPath(toObject, ["maxItems"], fromMaxItems);
  }
  const fromMaximum = getValueByPath(fromObject, ["maximum"]);
  if (fromMaximum != null) {
    setValueByPath(toObject, ["maximum"], fromMaximum);
  }
  const fromMinItems = getValueByPath(fromObject, ["minItems"]);
  if (fromMinItems != null) {
    setValueByPath(toObject, ["minItems"], fromMinItems);
  }
  const fromMinimum = getValueByPath(fromObject, ["minimum"]);
  if (fromMinimum != null) {
    setValueByPath(toObject, ["minimum"], fromMinimum);
  }
  const fromNullable = getValueByPath(fromObject, ["nullable"]);
  if (fromNullable != null) {
    setValueByPath(toObject, ["nullable"], fromNullable);
  }
  const fromProperties = getValueByPath(fromObject, ["properties"]);
  if (fromProperties != null) {
    setValueByPath(toObject, ["properties"], fromProperties);
  }
  const fromPropertyOrdering = getValueByPath(fromObject, [
    "propertyOrdering"
  ]);
  if (fromPropertyOrdering != null) {
    setValueByPath(toObject, ["propertyOrdering"], fromPropertyOrdering);
  }
  const fromRequired = getValueByPath(fromObject, ["required"]);
  if (fromRequired != null) {
    setValueByPath(toObject, ["required"], fromRequired);
  }
  const fromTitle = getValueByPath(fromObject, ["title"]);
  if (fromTitle != null) {
    setValueByPath(toObject, ["title"], fromTitle);
  }
  const fromType = getValueByPath(fromObject, ["type"]);
  if (fromType != null) {
    setValueByPath(toObject, ["type"], fromType);
  }
  return toObject;
}
function functionDeclarationToVertex$1(apiClient, fromObject) {
  const toObject = {};
  const fromResponse = getValueByPath(fromObject, ["response"]);
  if (fromResponse != null) {
    setValueByPath(toObject, ["response"], schemaToVertex$1(apiClient, fromResponse));
  }
  const fromDescription = getValueByPath(fromObject, ["description"]);
  if (fromDescription != null) {
    setValueByPath(toObject, ["description"], fromDescription);
  }
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName != null) {
    setValueByPath(toObject, ["name"], fromName);
  }
  const fromParameters = getValueByPath(fromObject, ["parameters"]);
  if (fromParameters != null) {
    setValueByPath(toObject, ["parameters"], fromParameters);
  }
  return toObject;
}
function googleSearchToVertex$1() {
  const toObject = {};
  return toObject;
}
function dynamicRetrievalConfigToVertex$1(apiClient, fromObject) {
  const toObject = {};
  const fromMode = getValueByPath(fromObject, ["mode"]);
  if (fromMode != null) {
    setValueByPath(toObject, ["mode"], fromMode);
  }
  const fromDynamicThreshold = getValueByPath(fromObject, [
    "dynamicThreshold"
  ]);
  if (fromDynamicThreshold != null) {
    setValueByPath(toObject, ["dynamicThreshold"], fromDynamicThreshold);
  }
  return toObject;
}
function googleSearchRetrievalToVertex$1(apiClient, fromObject) {
  const toObject = {};
  const fromDynamicRetrievalConfig = getValueByPath(fromObject, [
    "dynamicRetrievalConfig"
  ]);
  if (fromDynamicRetrievalConfig != null) {
    setValueByPath(toObject, ["dynamicRetrievalConfig"], dynamicRetrievalConfigToVertex$1(apiClient, fromDynamicRetrievalConfig));
  }
  return toObject;
}
function toolToVertex$1(apiClient, fromObject) {
  const toObject = {};
  const fromFunctionDeclarations = getValueByPath(fromObject, [
    "functionDeclarations"
  ]);
  if (fromFunctionDeclarations != null) {
    if (Array.isArray(fromFunctionDeclarations)) {
      setValueByPath(toObject, ["functionDeclarations"], fromFunctionDeclarations.map((item) => {
        return functionDeclarationToVertex$1(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["functionDeclarations"], fromFunctionDeclarations);
    }
  }
  const fromRetrieval = getValueByPath(fromObject, ["retrieval"]);
  if (fromRetrieval != null) {
    setValueByPath(toObject, ["retrieval"], fromRetrieval);
  }
  const fromGoogleSearch = getValueByPath(fromObject, ["googleSearch"]);
  if (fromGoogleSearch != null) {
    setValueByPath(toObject, ["googleSearch"], googleSearchToVertex$1());
  }
  const fromGoogleSearchRetrieval = getValueByPath(fromObject, [
    "googleSearchRetrieval"
  ]);
  if (fromGoogleSearchRetrieval != null) {
    setValueByPath(toObject, ["googleSearchRetrieval"], googleSearchRetrievalToVertex$1(apiClient, fromGoogleSearchRetrieval));
  }
  const fromCodeExecution = getValueByPath(fromObject, [
    "codeExecution"
  ]);
  if (fromCodeExecution != null) {
    setValueByPath(toObject, ["codeExecution"], fromCodeExecution);
  }
  return toObject;
}
function functionCallingConfigToVertex$1(apiClient, fromObject) {
  const toObject = {};
  const fromMode = getValueByPath(fromObject, ["mode"]);
  if (fromMode != null) {
    setValueByPath(toObject, ["mode"], fromMode);
  }
  const fromAllowedFunctionNames = getValueByPath(fromObject, [
    "allowedFunctionNames"
  ]);
  if (fromAllowedFunctionNames != null) {
    setValueByPath(toObject, ["allowedFunctionNames"], fromAllowedFunctionNames);
  }
  return toObject;
}
function toolConfigToVertex$1(apiClient, fromObject) {
  const toObject = {};
  const fromFunctionCallingConfig = getValueByPath(fromObject, [
    "functionCallingConfig"
  ]);
  if (fromFunctionCallingConfig != null) {
    setValueByPath(toObject, ["functionCallingConfig"], functionCallingConfigToVertex$1(apiClient, fromFunctionCallingConfig));
  }
  return toObject;
}
function createCachedContentConfigToVertex(apiClient, fromObject, parentObject) {
  const toObject = {};
  const fromTtl = getValueByPath(fromObject, ["ttl"]);
  if (parentObject !== void 0 && fromTtl != null) {
    setValueByPath(parentObject, ["ttl"], fromTtl);
  }
  const fromExpireTime = getValueByPath(fromObject, ["expireTime"]);
  if (parentObject !== void 0 && fromExpireTime != null) {
    setValueByPath(parentObject, ["expireTime"], fromExpireTime);
  }
  const fromDisplayName = getValueByPath(fromObject, ["displayName"]);
  if (parentObject !== void 0 && fromDisplayName != null) {
    setValueByPath(parentObject, ["displayName"], fromDisplayName);
  }
  const fromContents = getValueByPath(fromObject, ["contents"]);
  if (parentObject !== void 0 && fromContents != null) {
    if (Array.isArray(fromContents)) {
      setValueByPath(parentObject, ["contents"], tContents(apiClient, tContents(apiClient, fromContents).map((item) => {
        return contentToVertex$1(apiClient, item);
      })));
    } else {
      setValueByPath(parentObject, ["contents"], tContents(apiClient, fromContents));
    }
  }
  const fromSystemInstruction = getValueByPath(fromObject, [
    "systemInstruction"
  ]);
  if (parentObject !== void 0 && fromSystemInstruction != null) {
    setValueByPath(parentObject, ["systemInstruction"], contentToVertex$1(apiClient, tContent(apiClient, fromSystemInstruction)));
  }
  const fromTools = getValueByPath(fromObject, ["tools"]);
  if (parentObject !== void 0 && fromTools != null) {
    if (Array.isArray(fromTools)) {
      setValueByPath(parentObject, ["tools"], fromTools.map((item) => {
        return toolToVertex$1(apiClient, item);
      }));
    } else {
      setValueByPath(parentObject, ["tools"], fromTools);
    }
  }
  const fromToolConfig = getValueByPath(fromObject, ["toolConfig"]);
  if (parentObject !== void 0 && fromToolConfig != null) {
    setValueByPath(parentObject, ["toolConfig"], toolConfigToVertex$1(apiClient, fromToolConfig));
  }
  return toObject;
}
function createCachedContentParametersToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromModel = getValueByPath(fromObject, ["model"]);
  if (fromModel != null) {
    setValueByPath(toObject, ["model"], tCachesModel(apiClient, fromModel));
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], createCachedContentConfigToVertex(apiClient, fromConfig, toObject));
  }
  return toObject;
}
function getCachedContentParametersToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName != null) {
    setValueByPath(toObject, ["_url", "name"], tCachedContentName(apiClient, fromName));
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], fromConfig);
  }
  return toObject;
}
function deleteCachedContentParametersToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName != null) {
    setValueByPath(toObject, ["_url", "name"], tCachedContentName(apiClient, fromName));
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], fromConfig);
  }
  return toObject;
}
function updateCachedContentConfigToVertex(apiClient, fromObject, parentObject) {
  const toObject = {};
  const fromTtl = getValueByPath(fromObject, ["ttl"]);
  if (parentObject !== void 0 && fromTtl != null) {
    setValueByPath(parentObject, ["ttl"], fromTtl);
  }
  const fromExpireTime = getValueByPath(fromObject, ["expireTime"]);
  if (parentObject !== void 0 && fromExpireTime != null) {
    setValueByPath(parentObject, ["expireTime"], fromExpireTime);
  }
  return toObject;
}
function updateCachedContentParametersToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName != null) {
    setValueByPath(toObject, ["_url", "name"], tCachedContentName(apiClient, fromName));
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], updateCachedContentConfigToVertex(apiClient, fromConfig, toObject));
  }
  return toObject;
}
function listCachedContentsConfigToVertex(apiClient, fromObject, parentObject) {
  const toObject = {};
  const fromPageSize = getValueByPath(fromObject, ["pageSize"]);
  if (parentObject !== void 0 && fromPageSize != null) {
    setValueByPath(parentObject, ["_query", "pageSize"], fromPageSize);
  }
  const fromPageToken = getValueByPath(fromObject, ["pageToken"]);
  if (parentObject !== void 0 && fromPageToken != null) {
    setValueByPath(parentObject, ["_query", "pageToken"], fromPageToken);
  }
  return toObject;
}
function listCachedContentsParametersToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], listCachedContentsConfigToVertex(apiClient, fromConfig, toObject));
  }
  return toObject;
}
function cachedContentFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName != null) {
    setValueByPath(toObject, ["name"], fromName);
  }
  const fromDisplayName = getValueByPath(fromObject, ["displayName"]);
  if (fromDisplayName != null) {
    setValueByPath(toObject, ["displayName"], fromDisplayName);
  }
  const fromModel = getValueByPath(fromObject, ["model"]);
  if (fromModel != null) {
    setValueByPath(toObject, ["model"], fromModel);
  }
  const fromCreateTime = getValueByPath(fromObject, ["createTime"]);
  if (fromCreateTime != null) {
    setValueByPath(toObject, ["createTime"], fromCreateTime);
  }
  const fromUpdateTime = getValueByPath(fromObject, ["updateTime"]);
  if (fromUpdateTime != null) {
    setValueByPath(toObject, ["updateTime"], fromUpdateTime);
  }
  const fromExpireTime = getValueByPath(fromObject, ["expireTime"]);
  if (fromExpireTime != null) {
    setValueByPath(toObject, ["expireTime"], fromExpireTime);
  }
  const fromUsageMetadata = getValueByPath(fromObject, [
    "usageMetadata"
  ]);
  if (fromUsageMetadata != null) {
    setValueByPath(toObject, ["usageMetadata"], fromUsageMetadata);
  }
  return toObject;
}
function deleteCachedContentResponseFromMldev() {
  const toObject = {};
  return toObject;
}
function listCachedContentsResponseFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromNextPageToken = getValueByPath(fromObject, [
    "nextPageToken"
  ]);
  if (fromNextPageToken != null) {
    setValueByPath(toObject, ["nextPageToken"], fromNextPageToken);
  }
  const fromCachedContents = getValueByPath(fromObject, [
    "cachedContents"
  ]);
  if (fromCachedContents != null) {
    if (Array.isArray(fromCachedContents)) {
      setValueByPath(toObject, ["cachedContents"], fromCachedContents.map((item) => {
        return cachedContentFromMldev(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["cachedContents"], fromCachedContents);
    }
  }
  return toObject;
}
function cachedContentFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName != null) {
    setValueByPath(toObject, ["name"], fromName);
  }
  const fromDisplayName = getValueByPath(fromObject, ["displayName"]);
  if (fromDisplayName != null) {
    setValueByPath(toObject, ["displayName"], fromDisplayName);
  }
  const fromModel = getValueByPath(fromObject, ["model"]);
  if (fromModel != null) {
    setValueByPath(toObject, ["model"], fromModel);
  }
  const fromCreateTime = getValueByPath(fromObject, ["createTime"]);
  if (fromCreateTime != null) {
    setValueByPath(toObject, ["createTime"], fromCreateTime);
  }
  const fromUpdateTime = getValueByPath(fromObject, ["updateTime"]);
  if (fromUpdateTime != null) {
    setValueByPath(toObject, ["updateTime"], fromUpdateTime);
  }
  const fromExpireTime = getValueByPath(fromObject, ["expireTime"]);
  if (fromExpireTime != null) {
    setValueByPath(toObject, ["expireTime"], fromExpireTime);
  }
  const fromUsageMetadata = getValueByPath(fromObject, [
    "usageMetadata"
  ]);
  if (fromUsageMetadata != null) {
    setValueByPath(toObject, ["usageMetadata"], fromUsageMetadata);
  }
  return toObject;
}
function deleteCachedContentResponseFromVertex() {
  const toObject = {};
  return toObject;
}
function listCachedContentsResponseFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromNextPageToken = getValueByPath(fromObject, [
    "nextPageToken"
  ]);
  if (fromNextPageToken != null) {
    setValueByPath(toObject, ["nextPageToken"], fromNextPageToken);
  }
  const fromCachedContents = getValueByPath(fromObject, [
    "cachedContents"
  ]);
  if (fromCachedContents != null) {
    if (Array.isArray(fromCachedContents)) {
      setValueByPath(toObject, ["cachedContents"], fromCachedContents.map((item) => {
        return cachedContentFromVertex(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["cachedContents"], fromCachedContents);
    }
  }
  return toObject;
}
var PagedItem;
(function(PagedItem2) {
  PagedItem2["PAGED_ITEM_BATCH_JOBS"] = "batchJobs";
  PagedItem2["PAGED_ITEM_MODELS"] = "models";
  PagedItem2["PAGED_ITEM_TUNING_JOBS"] = "tuningJobs";
  PagedItem2["PAGED_ITEM_FILES"] = "files";
  PagedItem2["PAGED_ITEM_CACHED_CONTENTS"] = "cachedContents";
})(PagedItem || (PagedItem = {}));
var Pager = class {
  constructor(name, request, response, params) {
    this.pageInternal = [];
    this.paramsInternal = {};
    this.requestInternal = request;
    this.init(name, response, params);
  }
  init(name, response, params) {
    var _a, _b;
    this.nameInternal = name;
    this.pageInternal = response[this.nameInternal] || [];
    this.idxInternal = 0;
    let requestParams = { config: {} };
    if (!params) {
      requestParams = { config: {} };
    } else if (typeof params === "object") {
      requestParams = Object.assign({}, params);
    } else {
      requestParams = params;
    }
    if (requestParams["config"]) {
      requestParams["config"]["pageToken"] = response["nextPageToken"];
    }
    this.paramsInternal = requestParams;
    this.pageInternalSize = (_b = (_a = requestParams["config"]) === null || _a === void 0 ? void 0 : _a["pageSize"]) !== null && _b !== void 0 ? _b : this.pageInternal.length;
  }
  initNextPage(response) {
    this.init(this.nameInternal, response, this.paramsInternal);
  }
  /**
   * Returns the current page, which is a list of items.
   *
   * @remarks
   * The first page is retrieved when the pager is created. The returned list of
   * items could be a subset of the entire list.
   */
  get page() {
    return this.pageInternal;
  }
  /**
   * Returns the type of paged item (for example, ``batch_jobs``).
   */
  get name() {
    return this.nameInternal;
  }
  /**
   * Returns the length of the page fetched each time by this pager.
   *
   * @remarks
   * The number of items in the page is less than or equal to the page length.
   */
  get pageSize() {
    return this.pageInternalSize;
  }
  /**
   * Returns the parameters when making the API request for the next page.
   *
   * @remarks
   * Parameters contain a set of optional configs that can be
   * used to customize the API request. For example, the `pageToken` parameter
   * contains the token to request the next page.
   */
  get params() {
    return this.paramsInternal;
  }
  /**
   * Returns the total number of items in the current page.
   */
  get pageLength() {
    return this.pageInternal.length;
  }
  /**
   * Returns the item at the given index.
   */
  getItem(index) {
    return this.pageInternal[index];
  }
  /**
   * Returns an async iterator that support iterating through all items
   * retrieved from the API.
   *
   * @remarks
   * The iterator will automatically fetch the next page if there are more items
   * to fetch from the API.
   *
   * @example
   *
   * ```ts
   * const pager = await ai.files.list({config: {pageSize: 10}});
   * for await (const file of pager) {
   *   console.log(file.name);
   * }
   * ```
   */
  [Symbol.asyncIterator]() {
    return {
      next: async () => {
        if (this.idxInternal >= this.pageLength) {
          if (this.hasNextPage()) {
            await this.nextPage();
          } else {
            return { value: void 0, done: true };
          }
        }
        const item = this.getItem(this.idxInternal);
        this.idxInternal += 1;
        return { value: item, done: false };
      },
      return: async () => {
        return { value: void 0, done: true };
      }
    };
  }
  /**
   * Fetches the next page of items. This makes a new API request.
   *
   * @throws {Error} If there are no more pages to fetch.
   *
   * @example
   *
   * ```ts
   * const pager = await ai.files.list({config: {pageSize: 10}});
   * let page = pager.page;
   * while (true) {
   *   for (const file of page) {
   *     console.log(file.name);
   *   }
   *   if (!pager.hasNextPage()) {
   *     break;
   *   }
   *   page = await pager.nextPage();
   * }
   * ```
   */
  async nextPage() {
    if (!this.hasNextPage()) {
      throw new Error("No more pages to fetch.");
    }
    const response = await this.requestInternal(this.params);
    this.initNextPage(response);
    return this.page;
  }
  /**
   * Returns true if there are more pages to fetch from the API.
   */
  hasNextPage() {
    var _a;
    if (((_a = this.params["config"]) === null || _a === void 0 ? void 0 : _a["pageToken"]) !== void 0) {
      return true;
    }
    return false;
  }
};
var Outcome;
(function(Outcome2) {
  Outcome2["OUTCOME_UNSPECIFIED"] = "OUTCOME_UNSPECIFIED";
  Outcome2["OUTCOME_OK"] = "OUTCOME_OK";
  Outcome2["OUTCOME_FAILED"] = "OUTCOME_FAILED";
  Outcome2["OUTCOME_DEADLINE_EXCEEDED"] = "OUTCOME_DEADLINE_EXCEEDED";
})(Outcome || (Outcome = {}));
var Language;
(function(Language2) {
  Language2["LANGUAGE_UNSPECIFIED"] = "LANGUAGE_UNSPECIFIED";
  Language2["PYTHON"] = "PYTHON";
})(Language || (Language = {}));
var Type;
(function(Type2) {
  Type2["TYPE_UNSPECIFIED"] = "TYPE_UNSPECIFIED";
  Type2["STRING"] = "STRING";
  Type2["NUMBER"] = "NUMBER";
  Type2["INTEGER"] = "INTEGER";
  Type2["BOOLEAN"] = "BOOLEAN";
  Type2["ARRAY"] = "ARRAY";
  Type2["OBJECT"] = "OBJECT";
})(Type || (Type = {}));
var HarmCategory;
(function(HarmCategory2) {
  HarmCategory2["HARM_CATEGORY_UNSPECIFIED"] = "HARM_CATEGORY_UNSPECIFIED";
  HarmCategory2["HARM_CATEGORY_HATE_SPEECH"] = "HARM_CATEGORY_HATE_SPEECH";
  HarmCategory2["HARM_CATEGORY_DANGEROUS_CONTENT"] = "HARM_CATEGORY_DANGEROUS_CONTENT";
  HarmCategory2["HARM_CATEGORY_HARASSMENT"] = "HARM_CATEGORY_HARASSMENT";
  HarmCategory2["HARM_CATEGORY_SEXUALLY_EXPLICIT"] = "HARM_CATEGORY_SEXUALLY_EXPLICIT";
  HarmCategory2["HARM_CATEGORY_CIVIC_INTEGRITY"] = "HARM_CATEGORY_CIVIC_INTEGRITY";
})(HarmCategory || (HarmCategory = {}));
var HarmBlockMethod;
(function(HarmBlockMethod2) {
  HarmBlockMethod2["HARM_BLOCK_METHOD_UNSPECIFIED"] = "HARM_BLOCK_METHOD_UNSPECIFIED";
  HarmBlockMethod2["SEVERITY"] = "SEVERITY";
  HarmBlockMethod2["PROBABILITY"] = "PROBABILITY";
})(HarmBlockMethod || (HarmBlockMethod = {}));
var HarmBlockThreshold;
(function(HarmBlockThreshold2) {
  HarmBlockThreshold2["HARM_BLOCK_THRESHOLD_UNSPECIFIED"] = "HARM_BLOCK_THRESHOLD_UNSPECIFIED";
  HarmBlockThreshold2["BLOCK_LOW_AND_ABOVE"] = "BLOCK_LOW_AND_ABOVE";
  HarmBlockThreshold2["BLOCK_MEDIUM_AND_ABOVE"] = "BLOCK_MEDIUM_AND_ABOVE";
  HarmBlockThreshold2["BLOCK_ONLY_HIGH"] = "BLOCK_ONLY_HIGH";
  HarmBlockThreshold2["BLOCK_NONE"] = "BLOCK_NONE";
  HarmBlockThreshold2["OFF"] = "OFF";
})(HarmBlockThreshold || (HarmBlockThreshold = {}));
var Mode;
(function(Mode2) {
  Mode2["MODE_UNSPECIFIED"] = "MODE_UNSPECIFIED";
  Mode2["MODE_DYNAMIC"] = "MODE_DYNAMIC";
})(Mode || (Mode = {}));
var FinishReason;
(function(FinishReason2) {
  FinishReason2["FINISH_REASON_UNSPECIFIED"] = "FINISH_REASON_UNSPECIFIED";
  FinishReason2["STOP"] = "STOP";
  FinishReason2["MAX_TOKENS"] = "MAX_TOKENS";
  FinishReason2["SAFETY"] = "SAFETY";
  FinishReason2["RECITATION"] = "RECITATION";
  FinishReason2["OTHER"] = "OTHER";
  FinishReason2["BLOCKLIST"] = "BLOCKLIST";
  FinishReason2["PROHIBITED_CONTENT"] = "PROHIBITED_CONTENT";
  FinishReason2["SPII"] = "SPII";
  FinishReason2["MALFORMED_FUNCTION_CALL"] = "MALFORMED_FUNCTION_CALL";
  FinishReason2["IMAGE_SAFETY"] = "IMAGE_SAFETY";
})(FinishReason || (FinishReason = {}));
var HarmProbability;
(function(HarmProbability2) {
  HarmProbability2["HARM_PROBABILITY_UNSPECIFIED"] = "HARM_PROBABILITY_UNSPECIFIED";
  HarmProbability2["NEGLIGIBLE"] = "NEGLIGIBLE";
  HarmProbability2["LOW"] = "LOW";
  HarmProbability2["MEDIUM"] = "MEDIUM";
  HarmProbability2["HIGH"] = "HIGH";
})(HarmProbability || (HarmProbability = {}));
var HarmSeverity;
(function(HarmSeverity2) {
  HarmSeverity2["HARM_SEVERITY_UNSPECIFIED"] = "HARM_SEVERITY_UNSPECIFIED";
  HarmSeverity2["HARM_SEVERITY_NEGLIGIBLE"] = "HARM_SEVERITY_NEGLIGIBLE";
  HarmSeverity2["HARM_SEVERITY_LOW"] = "HARM_SEVERITY_LOW";
  HarmSeverity2["HARM_SEVERITY_MEDIUM"] = "HARM_SEVERITY_MEDIUM";
  HarmSeverity2["HARM_SEVERITY_HIGH"] = "HARM_SEVERITY_HIGH";
})(HarmSeverity || (HarmSeverity = {}));
var BlockedReason;
(function(BlockedReason2) {
  BlockedReason2["BLOCKED_REASON_UNSPECIFIED"] = "BLOCKED_REASON_UNSPECIFIED";
  BlockedReason2["SAFETY"] = "SAFETY";
  BlockedReason2["OTHER"] = "OTHER";
  BlockedReason2["BLOCKLIST"] = "BLOCKLIST";
  BlockedReason2["PROHIBITED_CONTENT"] = "PROHIBITED_CONTENT";
})(BlockedReason || (BlockedReason = {}));
var TrafficType;
(function(TrafficType2) {
  TrafficType2["TRAFFIC_TYPE_UNSPECIFIED"] = "TRAFFIC_TYPE_UNSPECIFIED";
  TrafficType2["ON_DEMAND"] = "ON_DEMAND";
  TrafficType2["PROVISIONED_THROUGHPUT"] = "PROVISIONED_THROUGHPUT";
})(TrafficType || (TrafficType = {}));
var Modality;
(function(Modality2) {
  Modality2["MODALITY_UNSPECIFIED"] = "MODALITY_UNSPECIFIED";
  Modality2["TEXT"] = "TEXT";
  Modality2["IMAGE"] = "IMAGE";
  Modality2["AUDIO"] = "AUDIO";
})(Modality || (Modality = {}));
var MediaResolution;
(function(MediaResolution2) {
  MediaResolution2["MEDIA_RESOLUTION_UNSPECIFIED"] = "MEDIA_RESOLUTION_UNSPECIFIED";
  MediaResolution2["MEDIA_RESOLUTION_LOW"] = "MEDIA_RESOLUTION_LOW";
  MediaResolution2["MEDIA_RESOLUTION_MEDIUM"] = "MEDIA_RESOLUTION_MEDIUM";
  MediaResolution2["MEDIA_RESOLUTION_HIGH"] = "MEDIA_RESOLUTION_HIGH";
})(MediaResolution || (MediaResolution = {}));
var DynamicRetrievalConfigMode;
(function(DynamicRetrievalConfigMode2) {
  DynamicRetrievalConfigMode2["MODE_UNSPECIFIED"] = "MODE_UNSPECIFIED";
  DynamicRetrievalConfigMode2["MODE_DYNAMIC"] = "MODE_DYNAMIC";
})(DynamicRetrievalConfigMode || (DynamicRetrievalConfigMode = {}));
var FunctionCallingConfigMode;
(function(FunctionCallingConfigMode2) {
  FunctionCallingConfigMode2["MODE_UNSPECIFIED"] = "MODE_UNSPECIFIED";
  FunctionCallingConfigMode2["AUTO"] = "AUTO";
  FunctionCallingConfigMode2["ANY"] = "ANY";
  FunctionCallingConfigMode2["NONE"] = "NONE";
})(FunctionCallingConfigMode || (FunctionCallingConfigMode = {}));
var SafetyFilterLevel;
(function(SafetyFilterLevel2) {
  SafetyFilterLevel2["BLOCK_LOW_AND_ABOVE"] = "BLOCK_LOW_AND_ABOVE";
  SafetyFilterLevel2["BLOCK_MEDIUM_AND_ABOVE"] = "BLOCK_MEDIUM_AND_ABOVE";
  SafetyFilterLevel2["BLOCK_ONLY_HIGH"] = "BLOCK_ONLY_HIGH";
  SafetyFilterLevel2["BLOCK_NONE"] = "BLOCK_NONE";
})(SafetyFilterLevel || (SafetyFilterLevel = {}));
var PersonGeneration;
(function(PersonGeneration2) {
  PersonGeneration2["DONT_ALLOW"] = "DONT_ALLOW";
  PersonGeneration2["ALLOW_ADULT"] = "ALLOW_ADULT";
  PersonGeneration2["ALLOW_ALL"] = "ALLOW_ALL";
})(PersonGeneration || (PersonGeneration = {}));
var ImagePromptLanguage;
(function(ImagePromptLanguage2) {
  ImagePromptLanguage2["auto"] = "auto";
  ImagePromptLanguage2["en"] = "en";
  ImagePromptLanguage2["ja"] = "ja";
  ImagePromptLanguage2["ko"] = "ko";
  ImagePromptLanguage2["hi"] = "hi";
})(ImagePromptLanguage || (ImagePromptLanguage = {}));
var FileState;
(function(FileState2) {
  FileState2["STATE_UNSPECIFIED"] = "STATE_UNSPECIFIED";
  FileState2["PROCESSING"] = "PROCESSING";
  FileState2["ACTIVE"] = "ACTIVE";
  FileState2["FAILED"] = "FAILED";
})(FileState || (FileState = {}));
var FileSource;
(function(FileSource2) {
  FileSource2["SOURCE_UNSPECIFIED"] = "SOURCE_UNSPECIFIED";
  FileSource2["UPLOADED"] = "UPLOADED";
  FileSource2["GENERATED"] = "GENERATED";
})(FileSource || (FileSource = {}));
var MaskReferenceMode;
(function(MaskReferenceMode2) {
  MaskReferenceMode2["MASK_MODE_DEFAULT"] = "MASK_MODE_DEFAULT";
  MaskReferenceMode2["MASK_MODE_USER_PROVIDED"] = "MASK_MODE_USER_PROVIDED";
  MaskReferenceMode2["MASK_MODE_BACKGROUND"] = "MASK_MODE_BACKGROUND";
  MaskReferenceMode2["MASK_MODE_FOREGROUND"] = "MASK_MODE_FOREGROUND";
  MaskReferenceMode2["MASK_MODE_SEMANTIC"] = "MASK_MODE_SEMANTIC";
})(MaskReferenceMode || (MaskReferenceMode = {}));
var ControlReferenceType;
(function(ControlReferenceType2) {
  ControlReferenceType2["CONTROL_TYPE_DEFAULT"] = "CONTROL_TYPE_DEFAULT";
  ControlReferenceType2["CONTROL_TYPE_CANNY"] = "CONTROL_TYPE_CANNY";
  ControlReferenceType2["CONTROL_TYPE_SCRIBBLE"] = "CONTROL_TYPE_SCRIBBLE";
  ControlReferenceType2["CONTROL_TYPE_FACE_MESH"] = "CONTROL_TYPE_FACE_MESH";
})(ControlReferenceType || (ControlReferenceType = {}));
var SubjectReferenceType;
(function(SubjectReferenceType2) {
  SubjectReferenceType2["SUBJECT_TYPE_DEFAULT"] = "SUBJECT_TYPE_DEFAULT";
  SubjectReferenceType2["SUBJECT_TYPE_PERSON"] = "SUBJECT_TYPE_PERSON";
  SubjectReferenceType2["SUBJECT_TYPE_ANIMAL"] = "SUBJECT_TYPE_ANIMAL";
  SubjectReferenceType2["SUBJECT_TYPE_PRODUCT"] = "SUBJECT_TYPE_PRODUCT";
})(SubjectReferenceType || (SubjectReferenceType = {}));
var MediaModality;
(function(MediaModality2) {
  MediaModality2["MODALITY_UNSPECIFIED"] = "MODALITY_UNSPECIFIED";
  MediaModality2["TEXT"] = "TEXT";
  MediaModality2["IMAGE"] = "IMAGE";
  MediaModality2["VIDEO"] = "VIDEO";
  MediaModality2["AUDIO"] = "AUDIO";
  MediaModality2["DOCUMENT"] = "DOCUMENT";
})(MediaModality || (MediaModality = {}));
var StartSensitivity;
(function(StartSensitivity2) {
  StartSensitivity2["START_SENSITIVITY_UNSPECIFIED"] = "START_SENSITIVITY_UNSPECIFIED";
  StartSensitivity2["START_SENSITIVITY_HIGH"] = "START_SENSITIVITY_HIGH";
  StartSensitivity2["START_SENSITIVITY_LOW"] = "START_SENSITIVITY_LOW";
})(StartSensitivity || (StartSensitivity = {}));
var EndSensitivity;
(function(EndSensitivity2) {
  EndSensitivity2["END_SENSITIVITY_UNSPECIFIED"] = "END_SENSITIVITY_UNSPECIFIED";
  EndSensitivity2["END_SENSITIVITY_HIGH"] = "END_SENSITIVITY_HIGH";
  EndSensitivity2["END_SENSITIVITY_LOW"] = "END_SENSITIVITY_LOW";
})(EndSensitivity || (EndSensitivity = {}));
var ActivityHandling;
(function(ActivityHandling2) {
  ActivityHandling2["ACTIVITY_HANDLING_UNSPECIFIED"] = "ACTIVITY_HANDLING_UNSPECIFIED";
  ActivityHandling2["START_OF_ACTIVITY_INTERRUPTS"] = "START_OF_ACTIVITY_INTERRUPTS";
  ActivityHandling2["NO_INTERRUPTION"] = "NO_INTERRUPTION";
})(ActivityHandling || (ActivityHandling = {}));
var TurnCoverage;
(function(TurnCoverage2) {
  TurnCoverage2["TURN_COVERAGE_UNSPECIFIED"] = "TURN_COVERAGE_UNSPECIFIED";
  TurnCoverage2["TURN_INCLUDES_ONLY_ACTIVITY"] = "TURN_INCLUDES_ONLY_ACTIVITY";
  TurnCoverage2["TURN_INCLUDES_ALL_INPUT"] = "TURN_INCLUDES_ALL_INPUT";
})(TurnCoverage || (TurnCoverage = {}));
var GenerateContentResponse = class {
  /**
   * Returns the concatenation of all text parts from the first candidate in the response.
   *
   * @remarks
   * If there are multiple candidates in the response, the text from the first
   * one will be returned.
   * If there are non-text parts in the response, the concatenation of all text
   * parts will be returned, and a warning will be logged.
   * If there are thought parts in the response, the concatenation of all text
   * parts excluding the thought parts will be returned.
   *
   * @example
   * ```ts
   * const response = await ai.models.generateContent({
   *   model: 'gemini-2.0-flash',
   *   contents:
   *     'Why is the sky blue?',
   * });
   *
   * console.debug(response.text);
   * ```
   */
  get text() {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (((_d = (_c = (_b = (_a = this.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d.length) === 0) {
      return void 0;
    }
    if (this.candidates && this.candidates.length > 1) {
      console.warn("there are multiple candidates in the response, returning text from the first one.");
    }
    let text = "";
    let anyTextPartText = false;
    const nonTextParts = [];
    for (const part of (_h = (_g = (_f = (_e = this.candidates) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.content) === null || _g === void 0 ? void 0 : _g.parts) !== null && _h !== void 0 ? _h : []) {
      for (const [fieldName, fieldValue] of Object.entries(part)) {
        if (fieldName !== "text" && fieldName !== "thought" && (fieldValue !== null || fieldValue !== void 0)) {
          nonTextParts.push(fieldName);
        }
      }
      if (typeof part.text === "string") {
        if (typeof part.thought === "boolean" && part.thought) {
          continue;
        }
        anyTextPartText = true;
        text += part.text;
      }
    }
    if (nonTextParts.length > 0) {
      console.warn(`there are non-text parts ${nonTextParts} in the response, returning concatenation of all text parts. Please refer to the non text parts for a full response from model.`);
    }
    return anyTextPartText ? text : void 0;
  }
  /**
   * Returns the function calls from the first candidate in the response.
   *
   * @remarks
   * If there are multiple candidates in the response, the function calls from
   * the first one will be returned.
   * If there are no function calls in the response, undefined will be returned.
   *
   * @example
   * ```ts
   * const controlLightFunctionDeclaration: FunctionDeclaration = {
   *   name: 'controlLight',
   *   parameters: {
   *   type: Type.OBJECT,
   *   description: 'Set the brightness and color temperature of a room light.',
   *   properties: {
   *     brightness: {
   *       type: Type.NUMBER,
   *       description:
   *         'Light level from 0 to 100. Zero is off and 100 is full brightness.',
   *     },
   *     colorTemperature: {
   *       type: Type.STRING,
   *       description:
   *         'Color temperature of the light fixture which can be `daylight`, `cool` or `warm`.',
   *     },
   *   },
   *   required: ['brightness', 'colorTemperature'],
   *  };
   *  const response = await ai.models.generateContent({
   *     model: 'gemini-2.0-flash',
   *     contents: 'Dim the lights so the room feels cozy and warm.',
   *     config: {
   *       tools: [{functionDeclarations: [controlLightFunctionDeclaration]}],
   *       toolConfig: {
   *         functionCallingConfig: {
   *           mode: FunctionCallingConfigMode.ANY,
   *           allowedFunctionNames: ['controlLight'],
   *         },
   *       },
   *     },
   *   });
   *  console.debug(JSON.stringify(response.functionCalls));
   * ```
   */
  get functionCalls() {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (((_d = (_c = (_b = (_a = this.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d.length) === 0) {
      return void 0;
    }
    if (this.candidates && this.candidates.length > 1) {
      console.warn("there are multiple candidates in the response, returning function calls from the first one.");
    }
    const functionCalls = (_h = (_g = (_f = (_e = this.candidates) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.content) === null || _g === void 0 ? void 0 : _g.parts) === null || _h === void 0 ? void 0 : _h.filter((part) => part.functionCall).map((part) => part.functionCall).filter((functionCall) => functionCall !== void 0);
    if ((functionCalls === null || functionCalls === void 0 ? void 0 : functionCalls.length) === 0) {
      return void 0;
    }
    return functionCalls;
  }
  /**
   * Returns the first executable code from the first candidate in the response.
   *
   * @remarks
   * If there are multiple candidates in the response, the executable code from
   * the first one will be returned.
   * If there are no executable code in the response, undefined will be
   * returned.
   *
   * @example
   * ```ts
   * const response = await ai.models.generateContent({
   *   model: 'gemini-2.0-flash',
   *   contents:
   *     'What is the sum of the first 50 prime numbers? Generate and run code for the calculation, and make sure you get all 50.'
   *   config: {
   *     tools: [{codeExecution: {}}],
   *   },
   * });
   *
   * console.debug(response.executableCode);
   * ```
   */
  get executableCode() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    if (((_d = (_c = (_b = (_a = this.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d.length) === 0) {
      return void 0;
    }
    if (this.candidates && this.candidates.length > 1) {
      console.warn("there are multiple candidates in the response, returning executable code from the first one.");
    }
    const executableCode = (_h = (_g = (_f = (_e = this.candidates) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.content) === null || _g === void 0 ? void 0 : _g.parts) === null || _h === void 0 ? void 0 : _h.filter((part) => part.executableCode).map((part) => part.executableCode).filter((executableCode2) => executableCode2 !== void 0);
    if ((executableCode === null || executableCode === void 0 ? void 0 : executableCode.length) === 0) {
      return void 0;
    }
    return (_j = executableCode === null || executableCode === void 0 ? void 0 : executableCode[0]) === null || _j === void 0 ? void 0 : _j.code;
  }
  /**
   * Returns the first code execution result from the first candidate in the response.
   *
   * @remarks
   * If there are multiple candidates in the response, the code execution result from
   * the first one will be returned.
   * If there are no code execution result in the response, undefined will be returned.
   *
   * @example
   * ```ts
   * const response = await ai.models.generateContent({
   *   model: 'gemini-2.0-flash',
   *   contents:
   *     'What is the sum of the first 50 prime numbers? Generate and run code for the calculation, and make sure you get all 50.'
   *   config: {
   *     tools: [{codeExecution: {}}],
   *   },
   * });
   *
   * console.debug(response.codeExecutionResult);
   * ```
   */
  get codeExecutionResult() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    if (((_d = (_c = (_b = (_a = this.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d.length) === 0) {
      return void 0;
    }
    if (this.candidates && this.candidates.length > 1) {
      console.warn("there are multiple candidates in the response, returning code execution result from the first one.");
    }
    const codeExecutionResult = (_h = (_g = (_f = (_e = this.candidates) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.content) === null || _g === void 0 ? void 0 : _g.parts) === null || _h === void 0 ? void 0 : _h.filter((part) => part.codeExecutionResult).map((part) => part.codeExecutionResult).filter((codeExecutionResult2) => codeExecutionResult2 !== void 0);
    if ((codeExecutionResult === null || codeExecutionResult === void 0 ? void 0 : codeExecutionResult.length) === 0) {
      return void 0;
    }
    return (_j = codeExecutionResult === null || codeExecutionResult === void 0 ? void 0 : codeExecutionResult[0]) === null || _j === void 0 ? void 0 : _j.output;
  }
};
var EmbedContentResponse = class {
};
var GenerateImagesResponse = class {
};
var CountTokensResponse = class {
};
var ComputeTokensResponse = class {
};
var DeleteCachedContentResponse = class {
};
var ListCachedContentsResponse = class {
};
var ListFilesResponse = class {
};
var HttpResponse = class {
  constructor(response) {
    const headers = {};
    for (const pair of response.headers.entries()) {
      headers[pair[0]] = pair[1];
    }
    this.headers = headers;
    this.responseInternal = response;
  }
  json() {
    return this.responseInternal.json();
  }
};
var CreateFileResponse = class {
};
var DeleteFileResponse = class {
};
var Caches = class extends BaseModule {
  constructor(apiClient) {
    super();
    this.apiClient = apiClient;
    this.list = async (params = {}) => {
      return new Pager(PagedItem.PAGED_ITEM_CACHED_CONTENTS, (x) => this.listInternal(x), await this.listInternal(params), params);
    };
  }
  /**
   * Creates a cached contents resource.
   *
   * @remarks
   * Context caching is only supported for specific models. See [Gemini
   * Developer API reference] (https://ai.google.dev/gemini-api/docs/caching?lang=node/context-cac)
   * and [Vertex AI reference] (https://cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-overview#supported_models)
   * for more information.
   *
   * @param params - The parameters for the create request.
   * @return The created cached content.
   *
   * @example
   * ```ts
   * const contents = ...; // Initialize the content to cache.
   * const response = await ai.caches.create({
   *   model: 'gemini-1.5-flash',
   *   config: {
   *    'contents': contents,
   *    'displayName': 'test cache',
   *    'systemInstruction': 'What is the sum of the two pdfs?',
   *    'ttl': '86400s',
   *  }
   * });
   * ```
   */
  async create(params) {
    var _a, _b;
    let response;
    let path = "";
    let queryParams = {};
    if (this.apiClient.isVertexAI()) {
      const body = createCachedContentParametersToVertex(this.apiClient, params);
      path = formatMap("cachedContents", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "POST",
        httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = cachedContentFromVertex(this.apiClient, apiResponse);
        return resp;
      });
    } else {
      const body = createCachedContentParametersToMldev(this.apiClient, params);
      path = formatMap("cachedContents", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "POST",
        httpOptions: (_b = params.config) === null || _b === void 0 ? void 0 : _b.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = cachedContentFromMldev(this.apiClient, apiResponse);
        return resp;
      });
    }
  }
  /**
   * Gets cached content configurations.
   *
   * @param params - The parameters for the get request.
   * @return The cached content.
   *
   * @example
   * ```ts
   * await ai.caches.get({name: 'gemini-1.5-flash'});
   * ```
   */
  async get(params) {
    var _a, _b;
    let response;
    let path = "";
    let queryParams = {};
    if (this.apiClient.isVertexAI()) {
      const body = getCachedContentParametersToVertex(this.apiClient, params);
      path = formatMap("{name}", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "GET",
        httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = cachedContentFromVertex(this.apiClient, apiResponse);
        return resp;
      });
    } else {
      const body = getCachedContentParametersToMldev(this.apiClient, params);
      path = formatMap("{name}", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "GET",
        httpOptions: (_b = params.config) === null || _b === void 0 ? void 0 : _b.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = cachedContentFromMldev(this.apiClient, apiResponse);
        return resp;
      });
    }
  }
  /**
   * Deletes cached content.
   *
   * @param params - The parameters for the delete request.
   * @return The empty response returned by the API.
   *
   * @example
   * ```ts
   * await ai.caches.delete({name: 'gemini-1.5-flash'});
   * ```
   */
  async delete(params) {
    var _a, _b;
    let response;
    let path = "";
    let queryParams = {};
    if (this.apiClient.isVertexAI()) {
      const body = deleteCachedContentParametersToVertex(this.apiClient, params);
      path = formatMap("{name}", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "DELETE",
        httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then(() => {
        const resp = deleteCachedContentResponseFromVertex();
        const typedResp = new DeleteCachedContentResponse();
        Object.assign(typedResp, resp);
        return typedResp;
      });
    } else {
      const body = deleteCachedContentParametersToMldev(this.apiClient, params);
      path = formatMap("{name}", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "DELETE",
        httpOptions: (_b = params.config) === null || _b === void 0 ? void 0 : _b.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then(() => {
        const resp = deleteCachedContentResponseFromMldev();
        const typedResp = new DeleteCachedContentResponse();
        Object.assign(typedResp, resp);
        return typedResp;
      });
    }
  }
  /**
   * Updates cached content configurations.
   *
   * @param params - The parameters for the update request.
   * @return The updated cached content.
   *
   * @example
   * ```ts
   * const response = await ai.caches.update({
   *   name: 'gemini-1.5-flash',
   *   config: {'ttl': '7600s'}
   * });
   * ```
   */
  async update(params) {
    var _a, _b;
    let response;
    let path = "";
    let queryParams = {};
    if (this.apiClient.isVertexAI()) {
      const body = updateCachedContentParametersToVertex(this.apiClient, params);
      path = formatMap("{name}", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "PATCH",
        httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = cachedContentFromVertex(this.apiClient, apiResponse);
        return resp;
      });
    } else {
      const body = updateCachedContentParametersToMldev(this.apiClient, params);
      path = formatMap("{name}", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "PATCH",
        httpOptions: (_b = params.config) === null || _b === void 0 ? void 0 : _b.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = cachedContentFromMldev(this.apiClient, apiResponse);
        return resp;
      });
    }
  }
  async listInternal(params) {
    var _a, _b;
    let response;
    let path = "";
    let queryParams = {};
    if (this.apiClient.isVertexAI()) {
      const body = listCachedContentsParametersToVertex(this.apiClient, params);
      path = formatMap("cachedContents", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "GET",
        httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = listCachedContentsResponseFromVertex(this.apiClient, apiResponse);
        const typedResp = new ListCachedContentsResponse();
        Object.assign(typedResp, resp);
        return typedResp;
      });
    } else {
      const body = listCachedContentsParametersToMldev(this.apiClient, params);
      path = formatMap("cachedContents", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "GET",
        httpOptions: (_b = params.config) === null || _b === void 0 ? void 0 : _b.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = listCachedContentsResponseFromMldev(this.apiClient, apiResponse);
        const typedResp = new ListCachedContentsResponse();
        Object.assign(typedResp, resp);
        return typedResp;
      });
    }
  }
};
function __values(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
  if (m) return m.call(o);
  if (o && typeof o.length === "number") return {
    next: function() {
      if (o && i >= o.length) o = void 0;
      return { value: o && o[i++], done: !o };
    }
  };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
function __await(v) {
  return this instanceof __await ? (this.v = v, this) : new __await(v);
}
function __asyncGenerator(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var g = generator.apply(thisArg, _arguments || []), i, q = [];
  return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function() {
    return this;
  }, i;
  function awaitReturn(f) {
    return function(v) {
      return Promise.resolve(v).then(f, reject);
    };
  }
  function verb(n, f) {
    if (g[n]) {
      i[n] = function(v) {
        return new Promise(function(a, b) {
          q.push([n, v, a, b]) > 1 || resume(n, v);
        });
      };
      if (f) i[n] = f(i[n]);
    }
  }
  function resume(n, v) {
    try {
      step(g[n](v));
    } catch (e) {
      settle(q[0][3], e);
    }
  }
  function step(r) {
    r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
  }
  function fulfill(value) {
    resume("next", value);
  }
  function reject(value) {
    resume("throw", value);
  }
  function settle(f, v) {
    if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
  }
}
function __asyncValues(o) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var m = o[Symbol.asyncIterator], i;
  return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
    return this;
  }, i);
  function verb(n) {
    i[n] = o[n] && function(v) {
      return new Promise(function(resolve, reject) {
        v = o[n](v), settle(resolve, reject, v.done, v.value);
      });
    };
  }
  function settle(resolve, reject, d, v) {
    Promise.resolve(v).then(function(v2) {
      resolve({ value: v2, done: d });
    }, reject);
  }
}
function isValidResponse(response) {
  var _a;
  if (response.candidates == void 0 || response.candidates.length === 0) {
    return false;
  }
  const content = (_a = response.candidates[0]) === null || _a === void 0 ? void 0 : _a.content;
  if (content === void 0) {
    return false;
  }
  return isValidContent(content);
}
function isValidContent(content) {
  if (content.parts === void 0 || content.parts.length === 0) {
    return false;
  }
  for (const part of content.parts) {
    if (part === void 0 || Object.keys(part).length === 0) {
      return false;
    }
    if (part.text !== void 0 && part.text === "") {
      return false;
    }
  }
  return true;
}
function validateHistory(history) {
  if (history.length === 0) {
    return;
  }
  if (history[0].role !== "user") {
    throw new Error("History must start with a user turn.");
  }
  for (const content of history) {
    if (content.role !== "user" && content.role !== "model") {
      throw new Error(`Role must be user or model, but got ${content.role}.`);
    }
  }
}
function extractCuratedHistory(comprehensiveHistory) {
  if (comprehensiveHistory === void 0 || comprehensiveHistory.length === 0) {
    return [];
  }
  const curatedHistory = [];
  const length = comprehensiveHistory.length;
  let i = 0;
  let userInput = comprehensiveHistory[0];
  while (i < length) {
    if (comprehensiveHistory[i].role === "user") {
      userInput = comprehensiveHistory[i];
      i++;
    } else {
      const modelOutput = [];
      let isValid = true;
      while (i < length && comprehensiveHistory[i].role === "model") {
        modelOutput.push(comprehensiveHistory[i]);
        if (isValid && !isValidContent(comprehensiveHistory[i])) {
          isValid = false;
        }
        i++;
      }
      if (isValid) {
        curatedHistory.push(userInput);
        curatedHistory.push(...modelOutput);
      }
    }
  }
  return curatedHistory;
}
var Chats = class {
  constructor(modelsModule, apiClient) {
    this.modelsModule = modelsModule;
    this.apiClient = apiClient;
  }
  /**
   * Creates a new chat session.
   *
   * @remarks
   * The config in the params will be used for all requests within the chat
   * session unless overridden by a per-request `config` in
   * @see {@link types.SendMessageParameters#config}.
   *
   * @param params - Parameters for creating a chat session.
   * @returns A new chat session.
   *
   * @example
   * ```ts
   * const chat = ai.chats.create({
   *   model: 'gemini-2.0-flash'
   *   config: {
   *     temperature: 0.5,
   *     maxOutputTokens: 1024,
   *   }
   * });
   * ```
   */
  create(params) {
    return new Chat(this.apiClient, this.modelsModule, params.model, params.config, params.history);
  }
};
var Chat = class {
  constructor(apiClient, modelsModule, model, config = {}, history = []) {
    this.apiClient = apiClient;
    this.modelsModule = modelsModule;
    this.model = model;
    this.config = config;
    this.history = history;
    this.sendPromise = Promise.resolve();
    validateHistory(history);
  }
  /**
   * Sends a message to the model and returns the response.
   *
   * @remarks
   * This method will wait for the previous message to be processed before
   * sending the next message.
   *
   * @see {@link Chat#sendMessageStream} for streaming method.
   * @param params - parameters for sending messages within a chat session.
   * @returns The model's response.
   *
   * @example
   * ```ts
   * const chat = ai.chats.create({model: 'gemini-2.0-flash'});
   * const response = await chat.sendMessage({
   *   message: 'Why is the sky blue?'
   * });
   * console.log(response.text);
   * ```
   */
  async sendMessage(params) {
    var _a;
    await this.sendPromise;
    const inputContent = tContent(this.apiClient, params.message);
    const responsePromise = this.modelsModule.generateContent({
      model: this.model,
      contents: this.getHistory(true).concat(inputContent),
      config: (_a = params.config) !== null && _a !== void 0 ? _a : this.config
    });
    this.sendPromise = (async () => {
      var _a2, _b;
      const response = await responsePromise;
      const outputContent = (_b = (_a2 = response.candidates) === null || _a2 === void 0 ? void 0 : _a2[0]) === null || _b === void 0 ? void 0 : _b.content;
      const modelOutput = outputContent ? [outputContent] : [];
      this.recordHistory(inputContent, modelOutput);
      return;
    })();
    await this.sendPromise;
    return responsePromise;
  }
  /**
   * Sends a message to the model and returns the response in chunks.
   *
   * @remarks
   * This method will wait for the previous message to be processed before
   * sending the next message.
   *
   * @see {@link Chat#sendMessage} for non-streaming method.
   * @param params - parameters for sending the message.
   * @return The model's response.
   *
   * @example
   * ```ts
   * const chat = ai.chats.create({model: 'gemini-2.0-flash'});
   * const response = await chat.sendMessageStream({
   *   message: 'Why is the sky blue?'
   * });
   * for await (const chunk of response) {
   *   console.log(chunk.text);
   * }
   * ```
   */
  async sendMessageStream(params) {
    var _a;
    await this.sendPromise;
    const inputContent = tContent(this.apiClient, params.message);
    const streamResponse = this.modelsModule.generateContentStream({
      model: this.model,
      contents: this.getHistory(true).concat(inputContent),
      config: (_a = params.config) !== null && _a !== void 0 ? _a : this.config
    });
    this.sendPromise = streamResponse.then(() => void 0);
    const response = await streamResponse;
    const result = this.processStreamResponse(response, inputContent);
    return result;
  }
  /**
   * Returns the chat history.
   *
   * @remarks
   * The history is a list of contents alternating between user and model.
   *
   * There are two types of history:
   * - The `curated history` contains only the valid turns between user and
   * model, which will be included in the subsequent requests sent to the model.
   * - The `comprehensive history` contains all turns, including invalid or
   *   empty model outputs, providing a complete record of the history.
   *
   * The history is updated after receiving the response from the model,
   * for streaming response, it means receiving the last chunk of the response.
   *
   * The `comprehensive history` is returned by default. To get the `curated
   * history`, set the `curated` parameter to `true`.
   *
   * @param curated - whether to return the curated history or the comprehensive
   *     history.
   * @return History contents alternating between user and model for the entire
   *     chat session.
   */
  getHistory(curated = false) {
    return curated ? extractCuratedHistory(this.history) : this.history;
  }
  processStreamResponse(streamResponse, inputContent) {
    var _a, _b;
    return __asyncGenerator(this, arguments, function* processStreamResponse_1() {
      var _c, e_1, _d, _e;
      const outputContent = [];
      try {
        for (var _f = true, streamResponse_1 = __asyncValues(streamResponse), streamResponse_1_1; streamResponse_1_1 = yield __await(streamResponse_1.next()), _c = streamResponse_1_1.done, !_c; _f = true) {
          _e = streamResponse_1_1.value;
          _f = false;
          const chunk = _e;
          if (isValidResponse(chunk)) {
            const content = (_b = (_a = chunk.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content;
            if (content !== void 0) {
              outputContent.push(content);
            }
          }
          yield yield __await(chunk);
        }
      } catch (e_1_1) {
        e_1 = { error: e_1_1 };
      } finally {
        try {
          if (!_f && !_c && (_d = streamResponse_1.return)) yield __await(_d.call(streamResponse_1));
        } finally {
          if (e_1) throw e_1.error;
        }
      }
      this.recordHistory(inputContent, outputContent);
    });
  }
  recordHistory(userInput, modelOutput) {
    let outputContents = [];
    if (modelOutput.length > 0 && modelOutput.every((content) => content.role === "model")) {
      outputContents = modelOutput;
    } else {
      outputContents.push({
        role: "model",
        parts: []
      });
    }
    this.history.push(userInput);
    this.history.push(...outputContents);
  }
};
function listFilesConfigToMldev(apiClient, fromObject, parentObject) {
  const toObject = {};
  const fromPageSize = getValueByPath(fromObject, ["pageSize"]);
  if (parentObject !== void 0 && fromPageSize != null) {
    setValueByPath(parentObject, ["_query", "pageSize"], fromPageSize);
  }
  const fromPageToken = getValueByPath(fromObject, ["pageToken"]);
  if (parentObject !== void 0 && fromPageToken != null) {
    setValueByPath(parentObject, ["_query", "pageToken"], fromPageToken);
  }
  return toObject;
}
function listFilesParametersToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], listFilesConfigToMldev(apiClient, fromConfig, toObject));
  }
  return toObject;
}
function fileStatusToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromDetails = getValueByPath(fromObject, ["details"]);
  if (fromDetails != null) {
    setValueByPath(toObject, ["details"], fromDetails);
  }
  const fromMessage = getValueByPath(fromObject, ["message"]);
  if (fromMessage != null) {
    setValueByPath(toObject, ["message"], fromMessage);
  }
  const fromCode = getValueByPath(fromObject, ["code"]);
  if (fromCode != null) {
    setValueByPath(toObject, ["code"], fromCode);
  }
  return toObject;
}
function fileToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName != null) {
    setValueByPath(toObject, ["name"], fromName);
  }
  const fromDisplayName = getValueByPath(fromObject, ["displayName"]);
  if (fromDisplayName != null) {
    setValueByPath(toObject, ["displayName"], fromDisplayName);
  }
  const fromMimeType = getValueByPath(fromObject, ["mimeType"]);
  if (fromMimeType != null) {
    setValueByPath(toObject, ["mimeType"], fromMimeType);
  }
  const fromSizeBytes = getValueByPath(fromObject, ["sizeBytes"]);
  if (fromSizeBytes != null) {
    setValueByPath(toObject, ["sizeBytes"], fromSizeBytes);
  }
  const fromCreateTime = getValueByPath(fromObject, ["createTime"]);
  if (fromCreateTime != null) {
    setValueByPath(toObject, ["createTime"], fromCreateTime);
  }
  const fromExpirationTime = getValueByPath(fromObject, [
    "expirationTime"
  ]);
  if (fromExpirationTime != null) {
    setValueByPath(toObject, ["expirationTime"], fromExpirationTime);
  }
  const fromUpdateTime = getValueByPath(fromObject, ["updateTime"]);
  if (fromUpdateTime != null) {
    setValueByPath(toObject, ["updateTime"], fromUpdateTime);
  }
  const fromSha256Hash = getValueByPath(fromObject, ["sha256Hash"]);
  if (fromSha256Hash != null) {
    setValueByPath(toObject, ["sha256Hash"], fromSha256Hash);
  }
  const fromUri = getValueByPath(fromObject, ["uri"]);
  if (fromUri != null) {
    setValueByPath(toObject, ["uri"], fromUri);
  }
  const fromDownloadUri = getValueByPath(fromObject, ["downloadUri"]);
  if (fromDownloadUri != null) {
    setValueByPath(toObject, ["downloadUri"], fromDownloadUri);
  }
  const fromState = getValueByPath(fromObject, ["state"]);
  if (fromState != null) {
    setValueByPath(toObject, ["state"], fromState);
  }
  const fromSource = getValueByPath(fromObject, ["source"]);
  if (fromSource != null) {
    setValueByPath(toObject, ["source"], fromSource);
  }
  const fromVideoMetadata = getValueByPath(fromObject, [
    "videoMetadata"
  ]);
  if (fromVideoMetadata != null) {
    setValueByPath(toObject, ["videoMetadata"], fromVideoMetadata);
  }
  const fromError = getValueByPath(fromObject, ["error"]);
  if (fromError != null) {
    setValueByPath(toObject, ["error"], fileStatusToMldev(apiClient, fromError));
  }
  return toObject;
}
function createFileParametersToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromFile = getValueByPath(fromObject, ["file"]);
  if (fromFile != null) {
    setValueByPath(toObject, ["file"], fileToMldev(apiClient, fromFile));
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], fromConfig);
  }
  return toObject;
}
function getFileParametersToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName != null) {
    setValueByPath(toObject, ["_url", "file"], tFileName(apiClient, fromName));
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], fromConfig);
  }
  return toObject;
}
function deleteFileParametersToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName != null) {
    setValueByPath(toObject, ["_url", "file"], tFileName(apiClient, fromName));
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], fromConfig);
  }
  return toObject;
}
function fileStatusFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromDetails = getValueByPath(fromObject, ["details"]);
  if (fromDetails != null) {
    setValueByPath(toObject, ["details"], fromDetails);
  }
  const fromMessage = getValueByPath(fromObject, ["message"]);
  if (fromMessage != null) {
    setValueByPath(toObject, ["message"], fromMessage);
  }
  const fromCode = getValueByPath(fromObject, ["code"]);
  if (fromCode != null) {
    setValueByPath(toObject, ["code"], fromCode);
  }
  return toObject;
}
function fileFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName != null) {
    setValueByPath(toObject, ["name"], fromName);
  }
  const fromDisplayName = getValueByPath(fromObject, ["displayName"]);
  if (fromDisplayName != null) {
    setValueByPath(toObject, ["displayName"], fromDisplayName);
  }
  const fromMimeType = getValueByPath(fromObject, ["mimeType"]);
  if (fromMimeType != null) {
    setValueByPath(toObject, ["mimeType"], fromMimeType);
  }
  const fromSizeBytes = getValueByPath(fromObject, ["sizeBytes"]);
  if (fromSizeBytes != null) {
    setValueByPath(toObject, ["sizeBytes"], fromSizeBytes);
  }
  const fromCreateTime = getValueByPath(fromObject, ["createTime"]);
  if (fromCreateTime != null) {
    setValueByPath(toObject, ["createTime"], fromCreateTime);
  }
  const fromExpirationTime = getValueByPath(fromObject, [
    "expirationTime"
  ]);
  if (fromExpirationTime != null) {
    setValueByPath(toObject, ["expirationTime"], fromExpirationTime);
  }
  const fromUpdateTime = getValueByPath(fromObject, ["updateTime"]);
  if (fromUpdateTime != null) {
    setValueByPath(toObject, ["updateTime"], fromUpdateTime);
  }
  const fromSha256Hash = getValueByPath(fromObject, ["sha256Hash"]);
  if (fromSha256Hash != null) {
    setValueByPath(toObject, ["sha256Hash"], fromSha256Hash);
  }
  const fromUri = getValueByPath(fromObject, ["uri"]);
  if (fromUri != null) {
    setValueByPath(toObject, ["uri"], fromUri);
  }
  const fromDownloadUri = getValueByPath(fromObject, ["downloadUri"]);
  if (fromDownloadUri != null) {
    setValueByPath(toObject, ["downloadUri"], fromDownloadUri);
  }
  const fromState = getValueByPath(fromObject, ["state"]);
  if (fromState != null) {
    setValueByPath(toObject, ["state"], fromState);
  }
  const fromSource = getValueByPath(fromObject, ["source"]);
  if (fromSource != null) {
    setValueByPath(toObject, ["source"], fromSource);
  }
  const fromVideoMetadata = getValueByPath(fromObject, [
    "videoMetadata"
  ]);
  if (fromVideoMetadata != null) {
    setValueByPath(toObject, ["videoMetadata"], fromVideoMetadata);
  }
  const fromError = getValueByPath(fromObject, ["error"]);
  if (fromError != null) {
    setValueByPath(toObject, ["error"], fileStatusFromMldev(apiClient, fromError));
  }
  return toObject;
}
function listFilesResponseFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromNextPageToken = getValueByPath(fromObject, [
    "nextPageToken"
  ]);
  if (fromNextPageToken != null) {
    setValueByPath(toObject, ["nextPageToken"], fromNextPageToken);
  }
  const fromFiles = getValueByPath(fromObject, ["files"]);
  if (fromFiles != null) {
    if (Array.isArray(fromFiles)) {
      setValueByPath(toObject, ["files"], fromFiles.map((item) => {
        return fileFromMldev(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["files"], fromFiles);
    }
  }
  return toObject;
}
function createFileResponseFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromHttpHeaders = getValueByPath(fromObject, ["httpHeaders"]);
  if (fromHttpHeaders != null) {
    setValueByPath(toObject, ["httpHeaders"], fromHttpHeaders);
  }
  return toObject;
}
function deleteFileResponseFromMldev() {
  const toObject = {};
  return toObject;
}
var Files = class extends BaseModule {
  constructor(apiClient) {
    super();
    this.apiClient = apiClient;
    this.list = async (params = {}) => {
      return new Pager(PagedItem.PAGED_ITEM_FILES, (x) => this.listInternal(x), await this.listInternal(params), params);
    };
  }
  /**
   * Uploads a file asynchronously to the Gemini API.
   * This method is not available in Vertex AI.
   * Supported upload sources:
   * - Node.js: File path (string) or Blob object.
   * - Browser: Blob object (e.g., File).
   *
   * @remarks
   * The `mimeType` can be specified in the `config` parameter. If omitted:
   *  - For file path (string) inputs, the `mimeType` will be inferred from the
   *     file extension.
   *  - For Blob object inputs, the `mimeType` will be set to the Blob's `type`
   *     property.
   * Somex eamples for file extension to mimeType mapping:
   * .txt -> text/plain
   * .json -> application/json
   * .jpg  -> image/jpeg
   * .png -> image/png
   * .mp3 -> audio/mpeg
   * .mp4 -> video/mp4
   *
   * This section can contain multiple paragraphs and code examples.
   *
   * @param params - Optional parameters specified in the
   *        `types.UploadFileParameters` interface.
   *         @see {@link types.UploadFileParameters#config} for the optional
   *         config in the parameters.
   * @return A promise that resolves to a `types.File` object.
   * @throws An error if called on a Vertex AI client.
   * @throws An error if the `mimeType` is not provided and can not be inferred,
   * the `mimeType` can be provided in the `params.config` parameter.
   * @throws An error occurs if a suitable upload location cannot be established.
   *
   * @example
   * The following code uploads a file to Gemini API.
   *
   * ```ts
   * const file = await ai.files.upload({file: 'file.txt', config: {
   *   mimeType: 'text/plain',
   * }});
   * console.log(file.name);
   * ```
   */
  async upload(params) {
    if (this.apiClient.isVertexAI()) {
      throw new Error("Vertex AI does not support uploading files. You can share files through a GCS bucket.");
    }
    return this.apiClient.uploadFile(params.file, params.config).then((response) => {
      const file = fileFromMldev(this.apiClient, response);
      return file;
    });
  }
  async listInternal(params) {
    var _a;
    let response;
    let path = "";
    let queryParams = {};
    if (this.apiClient.isVertexAI()) {
      throw new Error("This method is only supported by the Gemini Developer API.");
    } else {
      const body = listFilesParametersToMldev(this.apiClient, params);
      path = formatMap("files", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "GET",
        httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = listFilesResponseFromMldev(this.apiClient, apiResponse);
        const typedResp = new ListFilesResponse();
        Object.assign(typedResp, resp);
        return typedResp;
      });
    }
  }
  async createInternal(params) {
    var _a;
    let response;
    let path = "";
    let queryParams = {};
    if (this.apiClient.isVertexAI()) {
      throw new Error("This method is only supported by the Gemini Developer API.");
    } else {
      const body = createFileParametersToMldev(this.apiClient, params);
      path = formatMap("upload/v1beta/files", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "POST",
        httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = createFileResponseFromMldev(this.apiClient, apiResponse);
        const typedResp = new CreateFileResponse();
        Object.assign(typedResp, resp);
        return typedResp;
      });
    }
  }
  /**
   * Retrieves the file information from the service.
   *
   * @param params - The parameters for the get request
   * @return The Promise that resolves to the types.File object requested.
   *
   * @example
   * ```ts
   * const config: GetFileParameters = {
   *   name: fileName,
   * };
   * file = await ai.files.get(config);
   * console.log(file.name);
   * ```
   */
  async get(params) {
    var _a;
    let response;
    let path = "";
    let queryParams = {};
    if (this.apiClient.isVertexAI()) {
      throw new Error("This method is only supported by the Gemini Developer API.");
    } else {
      const body = getFileParametersToMldev(this.apiClient, params);
      path = formatMap("files/{file}", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "GET",
        httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = fileFromMldev(this.apiClient, apiResponse);
        return resp;
      });
    }
  }
  /**
   * Deletes a remotely stored file.
   *
   * @param params - The parameters for the delete request.
   * @return The DeleteFileResponse, the response for the delete method.
   *
   * @example
   * The following code deletes an example file named "files/mehozpxf877d".
   *
   * ```ts
   * await ai.files.delete({name: file.name});
   * ```
   */
  async delete(params) {
    var _a;
    let response;
    let path = "";
    let queryParams = {};
    if (this.apiClient.isVertexAI()) {
      throw new Error("This method is only supported by the Gemini Developer API.");
    } else {
      const body = deleteFileParametersToMldev(this.apiClient, params);
      path = formatMap("files/{file}", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "DELETE",
        httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then(() => {
        const resp = deleteFileResponseFromMldev();
        const typedResp = new DeleteFileResponse();
        Object.assign(typedResp, resp);
        return typedResp;
      });
    }
  }
};
function partToMldev(apiClient, fromObject) {
  const toObject = {};
  if (getValueByPath(fromObject, ["videoMetadata"]) !== void 0) {
    throw new Error("videoMetadata parameter is not supported in Gemini API.");
  }
  const fromThought = getValueByPath(fromObject, ["thought"]);
  if (fromThought != null) {
    setValueByPath(toObject, ["thought"], fromThought);
  }
  const fromCodeExecutionResult = getValueByPath(fromObject, [
    "codeExecutionResult"
  ]);
  if (fromCodeExecutionResult != null) {
    setValueByPath(toObject, ["codeExecutionResult"], fromCodeExecutionResult);
  }
  const fromExecutableCode = getValueByPath(fromObject, [
    "executableCode"
  ]);
  if (fromExecutableCode != null) {
    setValueByPath(toObject, ["executableCode"], fromExecutableCode);
  }
  const fromFileData = getValueByPath(fromObject, ["fileData"]);
  if (fromFileData != null) {
    setValueByPath(toObject, ["fileData"], fromFileData);
  }
  const fromFunctionCall = getValueByPath(fromObject, ["functionCall"]);
  if (fromFunctionCall != null) {
    setValueByPath(toObject, ["functionCall"], fromFunctionCall);
  }
  const fromFunctionResponse = getValueByPath(fromObject, [
    "functionResponse"
  ]);
  if (fromFunctionResponse != null) {
    setValueByPath(toObject, ["functionResponse"], fromFunctionResponse);
  }
  const fromInlineData = getValueByPath(fromObject, ["inlineData"]);
  if (fromInlineData != null) {
    setValueByPath(toObject, ["inlineData"], fromInlineData);
  }
  const fromText = getValueByPath(fromObject, ["text"]);
  if (fromText != null) {
    setValueByPath(toObject, ["text"], fromText);
  }
  return toObject;
}
function contentToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromParts = getValueByPath(fromObject, ["parts"]);
  if (fromParts != null) {
    if (Array.isArray(fromParts)) {
      setValueByPath(toObject, ["parts"], fromParts.map((item) => {
        return partToMldev(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["parts"], fromParts);
    }
  }
  const fromRole = getValueByPath(fromObject, ["role"]);
  if (fromRole != null) {
    setValueByPath(toObject, ["role"], fromRole);
  }
  return toObject;
}
function schemaToMldev(apiClient, fromObject) {
  const toObject = {};
  if (getValueByPath(fromObject, ["example"]) !== void 0) {
    throw new Error("example parameter is not supported in Gemini API.");
  }
  if (getValueByPath(fromObject, ["pattern"]) !== void 0) {
    throw new Error("pattern parameter is not supported in Gemini API.");
  }
  if (getValueByPath(fromObject, ["default"]) !== void 0) {
    throw new Error("default parameter is not supported in Gemini API.");
  }
  if (getValueByPath(fromObject, ["maxLength"]) !== void 0) {
    throw new Error("maxLength parameter is not supported in Gemini API.");
  }
  if (getValueByPath(fromObject, ["minLength"]) !== void 0) {
    throw new Error("minLength parameter is not supported in Gemini API.");
  }
  if (getValueByPath(fromObject, ["minProperties"]) !== void 0) {
    throw new Error("minProperties parameter is not supported in Gemini API.");
  }
  if (getValueByPath(fromObject, ["maxProperties"]) !== void 0) {
    throw new Error("maxProperties parameter is not supported in Gemini API.");
  }
  const fromAnyOf = getValueByPath(fromObject, ["anyOf"]);
  if (fromAnyOf != null) {
    setValueByPath(toObject, ["anyOf"], fromAnyOf);
  }
  const fromDescription = getValueByPath(fromObject, ["description"]);
  if (fromDescription != null) {
    setValueByPath(toObject, ["description"], fromDescription);
  }
  const fromEnum = getValueByPath(fromObject, ["enum"]);
  if (fromEnum != null) {
    setValueByPath(toObject, ["enum"], fromEnum);
  }
  const fromFormat = getValueByPath(fromObject, ["format"]);
  if (fromFormat != null) {
    setValueByPath(toObject, ["format"], fromFormat);
  }
  const fromItems = getValueByPath(fromObject, ["items"]);
  if (fromItems != null) {
    setValueByPath(toObject, ["items"], fromItems);
  }
  const fromMaxItems = getValueByPath(fromObject, ["maxItems"]);
  if (fromMaxItems != null) {
    setValueByPath(toObject, ["maxItems"], fromMaxItems);
  }
  const fromMaximum = getValueByPath(fromObject, ["maximum"]);
  if (fromMaximum != null) {
    setValueByPath(toObject, ["maximum"], fromMaximum);
  }
  const fromMinItems = getValueByPath(fromObject, ["minItems"]);
  if (fromMinItems != null) {
    setValueByPath(toObject, ["minItems"], fromMinItems);
  }
  const fromMinimum = getValueByPath(fromObject, ["minimum"]);
  if (fromMinimum != null) {
    setValueByPath(toObject, ["minimum"], fromMinimum);
  }
  const fromNullable = getValueByPath(fromObject, ["nullable"]);
  if (fromNullable != null) {
    setValueByPath(toObject, ["nullable"], fromNullable);
  }
  const fromProperties = getValueByPath(fromObject, ["properties"]);
  if (fromProperties != null) {
    setValueByPath(toObject, ["properties"], fromProperties);
  }
  const fromPropertyOrdering = getValueByPath(fromObject, [
    "propertyOrdering"
  ]);
  if (fromPropertyOrdering != null) {
    setValueByPath(toObject, ["propertyOrdering"], fromPropertyOrdering);
  }
  const fromRequired = getValueByPath(fromObject, ["required"]);
  if (fromRequired != null) {
    setValueByPath(toObject, ["required"], fromRequired);
  }
  const fromTitle = getValueByPath(fromObject, ["title"]);
  if (fromTitle != null) {
    setValueByPath(toObject, ["title"], fromTitle);
  }
  const fromType = getValueByPath(fromObject, ["type"]);
  if (fromType != null) {
    setValueByPath(toObject, ["type"], fromType);
  }
  return toObject;
}
function safetySettingToMldev(apiClient, fromObject) {
  const toObject = {};
  if (getValueByPath(fromObject, ["method"]) !== void 0) {
    throw new Error("method parameter is not supported in Gemini API.");
  }
  const fromCategory = getValueByPath(fromObject, ["category"]);
  if (fromCategory != null) {
    setValueByPath(toObject, ["category"], fromCategory);
  }
  const fromThreshold = getValueByPath(fromObject, ["threshold"]);
  if (fromThreshold != null) {
    setValueByPath(toObject, ["threshold"], fromThreshold);
  }
  return toObject;
}
function functionDeclarationToMldev(apiClient, fromObject) {
  const toObject = {};
  if (getValueByPath(fromObject, ["response"]) !== void 0) {
    throw new Error("response parameter is not supported in Gemini API.");
  }
  const fromDescription = getValueByPath(fromObject, ["description"]);
  if (fromDescription != null) {
    setValueByPath(toObject, ["description"], fromDescription);
  }
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName != null) {
    setValueByPath(toObject, ["name"], fromName);
  }
  const fromParameters = getValueByPath(fromObject, ["parameters"]);
  if (fromParameters != null) {
    setValueByPath(toObject, ["parameters"], fromParameters);
  }
  return toObject;
}
function googleSearchToMldev() {
  const toObject = {};
  return toObject;
}
function dynamicRetrievalConfigToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromMode = getValueByPath(fromObject, ["mode"]);
  if (fromMode != null) {
    setValueByPath(toObject, ["mode"], fromMode);
  }
  const fromDynamicThreshold = getValueByPath(fromObject, [
    "dynamicThreshold"
  ]);
  if (fromDynamicThreshold != null) {
    setValueByPath(toObject, ["dynamicThreshold"], fromDynamicThreshold);
  }
  return toObject;
}
function googleSearchRetrievalToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromDynamicRetrievalConfig = getValueByPath(fromObject, [
    "dynamicRetrievalConfig"
  ]);
  if (fromDynamicRetrievalConfig != null) {
    setValueByPath(toObject, ["dynamicRetrievalConfig"], dynamicRetrievalConfigToMldev(apiClient, fromDynamicRetrievalConfig));
  }
  return toObject;
}
function toolToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromFunctionDeclarations = getValueByPath(fromObject, [
    "functionDeclarations"
  ]);
  if (fromFunctionDeclarations != null) {
    if (Array.isArray(fromFunctionDeclarations)) {
      setValueByPath(toObject, ["functionDeclarations"], fromFunctionDeclarations.map((item) => {
        return functionDeclarationToMldev(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["functionDeclarations"], fromFunctionDeclarations);
    }
  }
  if (getValueByPath(fromObject, ["retrieval"]) !== void 0) {
    throw new Error("retrieval parameter is not supported in Gemini API.");
  }
  const fromGoogleSearch = getValueByPath(fromObject, ["googleSearch"]);
  if (fromGoogleSearch != null) {
    setValueByPath(toObject, ["googleSearch"], googleSearchToMldev());
  }
  const fromGoogleSearchRetrieval = getValueByPath(fromObject, [
    "googleSearchRetrieval"
  ]);
  if (fromGoogleSearchRetrieval != null) {
    setValueByPath(toObject, ["googleSearchRetrieval"], googleSearchRetrievalToMldev(apiClient, fromGoogleSearchRetrieval));
  }
  const fromCodeExecution = getValueByPath(fromObject, [
    "codeExecution"
  ]);
  if (fromCodeExecution != null) {
    setValueByPath(toObject, ["codeExecution"], fromCodeExecution);
  }
  return toObject;
}
function functionCallingConfigToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromMode = getValueByPath(fromObject, ["mode"]);
  if (fromMode != null) {
    setValueByPath(toObject, ["mode"], fromMode);
  }
  const fromAllowedFunctionNames = getValueByPath(fromObject, [
    "allowedFunctionNames"
  ]);
  if (fromAllowedFunctionNames != null) {
    setValueByPath(toObject, ["allowedFunctionNames"], fromAllowedFunctionNames);
  }
  return toObject;
}
function toolConfigToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromFunctionCallingConfig = getValueByPath(fromObject, [
    "functionCallingConfig"
  ]);
  if (fromFunctionCallingConfig != null) {
    setValueByPath(toObject, ["functionCallingConfig"], functionCallingConfigToMldev(apiClient, fromFunctionCallingConfig));
  }
  return toObject;
}
function prebuiltVoiceConfigToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromVoiceName = getValueByPath(fromObject, ["voiceName"]);
  if (fromVoiceName != null) {
    setValueByPath(toObject, ["voiceName"], fromVoiceName);
  }
  return toObject;
}
function voiceConfigToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromPrebuiltVoiceConfig = getValueByPath(fromObject, [
    "prebuiltVoiceConfig"
  ]);
  if (fromPrebuiltVoiceConfig != null) {
    setValueByPath(toObject, ["prebuiltVoiceConfig"], prebuiltVoiceConfigToMldev(apiClient, fromPrebuiltVoiceConfig));
  }
  return toObject;
}
function speechConfigToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromVoiceConfig = getValueByPath(fromObject, ["voiceConfig"]);
  if (fromVoiceConfig != null) {
    setValueByPath(toObject, ["voiceConfig"], voiceConfigToMldev(apiClient, fromVoiceConfig));
  }
  return toObject;
}
function thinkingConfigToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromIncludeThoughts = getValueByPath(fromObject, [
    "includeThoughts"
  ]);
  if (fromIncludeThoughts != null) {
    setValueByPath(toObject, ["includeThoughts"], fromIncludeThoughts);
  }
  const fromThinkingBudget = getValueByPath(fromObject, [
    "thinkingBudget"
  ]);
  if (fromThinkingBudget != null) {
    setValueByPath(toObject, ["thinkingBudget"], fromThinkingBudget);
  }
  return toObject;
}
function generateContentConfigToMldev(apiClient, fromObject, parentObject) {
  const toObject = {};
  const fromSystemInstruction = getValueByPath(fromObject, [
    "systemInstruction"
  ]);
  if (parentObject !== void 0 && fromSystemInstruction != null) {
    setValueByPath(parentObject, ["systemInstruction"], contentToMldev(apiClient, tContent(apiClient, fromSystemInstruction)));
  }
  const fromTemperature = getValueByPath(fromObject, ["temperature"]);
  if (fromTemperature != null) {
    setValueByPath(toObject, ["temperature"], fromTemperature);
  }
  const fromTopP = getValueByPath(fromObject, ["topP"]);
  if (fromTopP != null) {
    setValueByPath(toObject, ["topP"], fromTopP);
  }
  const fromTopK = getValueByPath(fromObject, ["topK"]);
  if (fromTopK != null) {
    setValueByPath(toObject, ["topK"], fromTopK);
  }
  const fromCandidateCount = getValueByPath(fromObject, [
    "candidateCount"
  ]);
  if (fromCandidateCount != null) {
    setValueByPath(toObject, ["candidateCount"], fromCandidateCount);
  }
  const fromMaxOutputTokens = getValueByPath(fromObject, [
    "maxOutputTokens"
  ]);
  if (fromMaxOutputTokens != null) {
    setValueByPath(toObject, ["maxOutputTokens"], fromMaxOutputTokens);
  }
  const fromStopSequences = getValueByPath(fromObject, [
    "stopSequences"
  ]);
  if (fromStopSequences != null) {
    setValueByPath(toObject, ["stopSequences"], fromStopSequences);
  }
  const fromResponseLogprobs = getValueByPath(fromObject, [
    "responseLogprobs"
  ]);
  if (fromResponseLogprobs != null) {
    setValueByPath(toObject, ["responseLogprobs"], fromResponseLogprobs);
  }
  const fromLogprobs = getValueByPath(fromObject, ["logprobs"]);
  if (fromLogprobs != null) {
    setValueByPath(toObject, ["logprobs"], fromLogprobs);
  }
  const fromPresencePenalty = getValueByPath(fromObject, [
    "presencePenalty"
  ]);
  if (fromPresencePenalty != null) {
    setValueByPath(toObject, ["presencePenalty"], fromPresencePenalty);
  }
  const fromFrequencyPenalty = getValueByPath(fromObject, [
    "frequencyPenalty"
  ]);
  if (fromFrequencyPenalty != null) {
    setValueByPath(toObject, ["frequencyPenalty"], fromFrequencyPenalty);
  }
  const fromSeed = getValueByPath(fromObject, ["seed"]);
  if (fromSeed != null) {
    setValueByPath(toObject, ["seed"], fromSeed);
  }
  const fromResponseMimeType = getValueByPath(fromObject, [
    "responseMimeType"
  ]);
  if (fromResponseMimeType != null) {
    setValueByPath(toObject, ["responseMimeType"], fromResponseMimeType);
  }
  const fromResponseSchema = getValueByPath(fromObject, [
    "responseSchema"
  ]);
  if (fromResponseSchema != null) {
    setValueByPath(toObject, ["responseSchema"], schemaToMldev(apiClient, tSchema(apiClient, fromResponseSchema)));
  }
  if (getValueByPath(fromObject, ["routingConfig"]) !== void 0) {
    throw new Error("routingConfig parameter is not supported in Gemini API.");
  }
  const fromSafetySettings = getValueByPath(fromObject, [
    "safetySettings"
  ]);
  if (parentObject !== void 0 && fromSafetySettings != null) {
    if (Array.isArray(fromSafetySettings)) {
      setValueByPath(parentObject, ["safetySettings"], fromSafetySettings.map((item) => {
        return safetySettingToMldev(apiClient, item);
      }));
    } else {
      setValueByPath(parentObject, ["safetySettings"], fromSafetySettings);
    }
  }
  const fromTools = getValueByPath(fromObject, ["tools"]);
  if (parentObject !== void 0 && fromTools != null) {
    if (Array.isArray(fromTools)) {
      setValueByPath(parentObject, ["tools"], tTools(apiClient, tTools(apiClient, fromTools).map((item) => {
        return toolToMldev(apiClient, tTool(apiClient, item));
      })));
    } else {
      setValueByPath(parentObject, ["tools"], tTools(apiClient, fromTools));
    }
  }
  const fromToolConfig = getValueByPath(fromObject, ["toolConfig"]);
  if (parentObject !== void 0 && fromToolConfig != null) {
    setValueByPath(parentObject, ["toolConfig"], toolConfigToMldev(apiClient, fromToolConfig));
  }
  if (getValueByPath(fromObject, ["labels"]) !== void 0) {
    throw new Error("labels parameter is not supported in Gemini API.");
  }
  const fromCachedContent = getValueByPath(fromObject, [
    "cachedContent"
  ]);
  if (parentObject !== void 0 && fromCachedContent != null) {
    setValueByPath(parentObject, ["cachedContent"], tCachedContentName(apiClient, fromCachedContent));
  }
  const fromResponseModalities = getValueByPath(fromObject, [
    "responseModalities"
  ]);
  if (fromResponseModalities != null) {
    setValueByPath(toObject, ["responseModalities"], fromResponseModalities);
  }
  const fromMediaResolution = getValueByPath(fromObject, [
    "mediaResolution"
  ]);
  if (fromMediaResolution != null) {
    setValueByPath(toObject, ["mediaResolution"], fromMediaResolution);
  }
  const fromSpeechConfig = getValueByPath(fromObject, ["speechConfig"]);
  if (fromSpeechConfig != null) {
    setValueByPath(toObject, ["speechConfig"], speechConfigToMldev(apiClient, tSpeechConfig(apiClient, fromSpeechConfig)));
  }
  if (getValueByPath(fromObject, ["audioTimestamp"]) !== void 0) {
    throw new Error("audioTimestamp parameter is not supported in Gemini API.");
  }
  const fromThinkingConfig = getValueByPath(fromObject, [
    "thinkingConfig"
  ]);
  if (fromThinkingConfig != null) {
    setValueByPath(toObject, ["thinkingConfig"], thinkingConfigToMldev(apiClient, fromThinkingConfig));
  }
  return toObject;
}
function generateContentParametersToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromModel = getValueByPath(fromObject, ["model"]);
  if (fromModel != null) {
    setValueByPath(toObject, ["_url", "model"], tModel(apiClient, fromModel));
  }
  const fromContents = getValueByPath(fromObject, ["contents"]);
  if (fromContents != null) {
    if (Array.isArray(fromContents)) {
      setValueByPath(toObject, ["contents"], tContents(apiClient, tContents(apiClient, fromContents).map((item) => {
        return contentToMldev(apiClient, item);
      })));
    } else {
      setValueByPath(toObject, ["contents"], tContents(apiClient, fromContents));
    }
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["generationConfig"], generateContentConfigToMldev(apiClient, fromConfig, toObject));
  }
  return toObject;
}
function embedContentConfigToMldev(apiClient, fromObject, parentObject) {
  const toObject = {};
  const fromTaskType = getValueByPath(fromObject, ["taskType"]);
  if (parentObject !== void 0 && fromTaskType != null) {
    setValueByPath(parentObject, ["requests[]", "taskType"], fromTaskType);
  }
  const fromTitle = getValueByPath(fromObject, ["title"]);
  if (parentObject !== void 0 && fromTitle != null) {
    setValueByPath(parentObject, ["requests[]", "title"], fromTitle);
  }
  const fromOutputDimensionality = getValueByPath(fromObject, [
    "outputDimensionality"
  ]);
  if (parentObject !== void 0 && fromOutputDimensionality != null) {
    setValueByPath(parentObject, ["requests[]", "outputDimensionality"], fromOutputDimensionality);
  }
  if (getValueByPath(fromObject, ["mimeType"]) !== void 0) {
    throw new Error("mimeType parameter is not supported in Gemini API.");
  }
  if (getValueByPath(fromObject, ["autoTruncate"]) !== void 0) {
    throw new Error("autoTruncate parameter is not supported in Gemini API.");
  }
  return toObject;
}
function embedContentParametersToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromModel = getValueByPath(fromObject, ["model"]);
  if (fromModel != null) {
    setValueByPath(toObject, ["_url", "model"], tModel(apiClient, fromModel));
  }
  const fromContents = getValueByPath(fromObject, ["contents"]);
  if (fromContents != null) {
    setValueByPath(toObject, ["requests[]", "content"], tContentsForEmbed(apiClient, fromContents));
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], embedContentConfigToMldev(apiClient, fromConfig, toObject));
  }
  const fromModelForEmbedContent = getValueByPath(fromObject, ["model"]);
  if (fromModelForEmbedContent !== void 0) {
    setValueByPath(toObject, ["requests[]", "model"], tModel(apiClient, fromModelForEmbedContent));
  }
  return toObject;
}
function generateImagesConfigToMldev(apiClient, fromObject, parentObject) {
  const toObject = {};
  if (getValueByPath(fromObject, ["outputGcsUri"]) !== void 0) {
    throw new Error("outputGcsUri parameter is not supported in Gemini API.");
  }
  if (getValueByPath(fromObject, ["negativePrompt"]) !== void 0) {
    throw new Error("negativePrompt parameter is not supported in Gemini API.");
  }
  const fromNumberOfImages = getValueByPath(fromObject, [
    "numberOfImages"
  ]);
  if (parentObject !== void 0 && fromNumberOfImages != null) {
    setValueByPath(parentObject, ["parameters", "sampleCount"], fromNumberOfImages);
  }
  const fromAspectRatio = getValueByPath(fromObject, ["aspectRatio"]);
  if (parentObject !== void 0 && fromAspectRatio != null) {
    setValueByPath(parentObject, ["parameters", "aspectRatio"], fromAspectRatio);
  }
  const fromGuidanceScale = getValueByPath(fromObject, [
    "guidanceScale"
  ]);
  if (parentObject !== void 0 && fromGuidanceScale != null) {
    setValueByPath(parentObject, ["parameters", "guidanceScale"], fromGuidanceScale);
  }
  if (getValueByPath(fromObject, ["seed"]) !== void 0) {
    throw new Error("seed parameter is not supported in Gemini API.");
  }
  const fromSafetyFilterLevel = getValueByPath(fromObject, [
    "safetyFilterLevel"
  ]);
  if (parentObject !== void 0 && fromSafetyFilterLevel != null) {
    setValueByPath(parentObject, ["parameters", "safetySetting"], fromSafetyFilterLevel);
  }
  const fromPersonGeneration = getValueByPath(fromObject, [
    "personGeneration"
  ]);
  if (parentObject !== void 0 && fromPersonGeneration != null) {
    setValueByPath(parentObject, ["parameters", "personGeneration"], fromPersonGeneration);
  }
  const fromIncludeSafetyAttributes = getValueByPath(fromObject, [
    "includeSafetyAttributes"
  ]);
  if (parentObject !== void 0 && fromIncludeSafetyAttributes != null) {
    setValueByPath(parentObject, ["parameters", "includeSafetyAttributes"], fromIncludeSafetyAttributes);
  }
  const fromIncludeRaiReason = getValueByPath(fromObject, [
    "includeRaiReason"
  ]);
  if (parentObject !== void 0 && fromIncludeRaiReason != null) {
    setValueByPath(parentObject, ["parameters", "includeRaiReason"], fromIncludeRaiReason);
  }
  const fromLanguage = getValueByPath(fromObject, ["language"]);
  if (parentObject !== void 0 && fromLanguage != null) {
    setValueByPath(parentObject, ["parameters", "language"], fromLanguage);
  }
  const fromOutputMimeType = getValueByPath(fromObject, [
    "outputMimeType"
  ]);
  if (parentObject !== void 0 && fromOutputMimeType != null) {
    setValueByPath(parentObject, ["parameters", "outputOptions", "mimeType"], fromOutputMimeType);
  }
  const fromOutputCompressionQuality = getValueByPath(fromObject, [
    "outputCompressionQuality"
  ]);
  if (parentObject !== void 0 && fromOutputCompressionQuality != null) {
    setValueByPath(parentObject, ["parameters", "outputOptions", "compressionQuality"], fromOutputCompressionQuality);
  }
  if (getValueByPath(fromObject, ["addWatermark"]) !== void 0) {
    throw new Error("addWatermark parameter is not supported in Gemini API.");
  }
  if (getValueByPath(fromObject, ["enhancePrompt"]) !== void 0) {
    throw new Error("enhancePrompt parameter is not supported in Gemini API.");
  }
  return toObject;
}
function generateImagesParametersToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromModel = getValueByPath(fromObject, ["model"]);
  if (fromModel != null) {
    setValueByPath(toObject, ["_url", "model"], tModel(apiClient, fromModel));
  }
  const fromPrompt = getValueByPath(fromObject, ["prompt"]);
  if (fromPrompt != null) {
    setValueByPath(toObject, ["instances[0]", "prompt"], fromPrompt);
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], generateImagesConfigToMldev(apiClient, fromConfig, toObject));
  }
  return toObject;
}
function getModelParametersToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromModel = getValueByPath(fromObject, ["model"]);
  if (fromModel != null) {
    setValueByPath(toObject, ["_url", "name"], tModel(apiClient, fromModel));
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], fromConfig);
  }
  return toObject;
}
function countTokensConfigToMldev(apiClient, fromObject) {
  const toObject = {};
  if (getValueByPath(fromObject, ["systemInstruction"]) !== void 0) {
    throw new Error("systemInstruction parameter is not supported in Gemini API.");
  }
  if (getValueByPath(fromObject, ["tools"]) !== void 0) {
    throw new Error("tools parameter is not supported in Gemini API.");
  }
  if (getValueByPath(fromObject, ["generationConfig"]) !== void 0) {
    throw new Error("generationConfig parameter is not supported in Gemini API.");
  }
  return toObject;
}
function countTokensParametersToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromModel = getValueByPath(fromObject, ["model"]);
  if (fromModel != null) {
    setValueByPath(toObject, ["_url", "model"], tModel(apiClient, fromModel));
  }
  const fromContents = getValueByPath(fromObject, ["contents"]);
  if (fromContents != null) {
    if (Array.isArray(fromContents)) {
      setValueByPath(toObject, ["contents"], tContents(apiClient, tContents(apiClient, fromContents).map((item) => {
        return contentToMldev(apiClient, item);
      })));
    } else {
      setValueByPath(toObject, ["contents"], tContents(apiClient, fromContents));
    }
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], countTokensConfigToMldev(apiClient, fromConfig));
  }
  return toObject;
}
function imageToMldev(apiClient, fromObject) {
  const toObject = {};
  if (getValueByPath(fromObject, ["gcsUri"]) !== void 0) {
    throw new Error("gcsUri parameter is not supported in Gemini API.");
  }
  const fromImageBytes = getValueByPath(fromObject, ["imageBytes"]);
  if (fromImageBytes != null) {
    setValueByPath(toObject, ["bytesBase64Encoded"], tBytes(apiClient, fromImageBytes));
  }
  const fromMimeType = getValueByPath(fromObject, ["mimeType"]);
  if (fromMimeType != null) {
    setValueByPath(toObject, ["mimeType"], fromMimeType);
  }
  return toObject;
}
function generateVideosConfigToMldev(apiClient, fromObject, parentObject) {
  const toObject = {};
  const fromNumberOfVideos = getValueByPath(fromObject, [
    "numberOfVideos"
  ]);
  if (parentObject !== void 0 && fromNumberOfVideos != null) {
    setValueByPath(parentObject, ["parameters", "sampleCount"], fromNumberOfVideos);
  }
  if (getValueByPath(fromObject, ["outputGcsUri"]) !== void 0) {
    throw new Error("outputGcsUri parameter is not supported in Gemini API.");
  }
  if (getValueByPath(fromObject, ["fps"]) !== void 0) {
    throw new Error("fps parameter is not supported in Gemini API.");
  }
  const fromDurationSeconds = getValueByPath(fromObject, [
    "durationSeconds"
  ]);
  if (parentObject !== void 0 && fromDurationSeconds != null) {
    setValueByPath(parentObject, ["parameters", "durationSeconds"], fromDurationSeconds);
  }
  if (getValueByPath(fromObject, ["seed"]) !== void 0) {
    throw new Error("seed parameter is not supported in Gemini API.");
  }
  const fromAspectRatio = getValueByPath(fromObject, ["aspectRatio"]);
  if (parentObject !== void 0 && fromAspectRatio != null) {
    setValueByPath(parentObject, ["parameters", "aspectRatio"], fromAspectRatio);
  }
  if (getValueByPath(fromObject, ["resolution"]) !== void 0) {
    throw new Error("resolution parameter is not supported in Gemini API.");
  }
  const fromPersonGeneration = getValueByPath(fromObject, [
    "personGeneration"
  ]);
  if (parentObject !== void 0 && fromPersonGeneration != null) {
    setValueByPath(parentObject, ["parameters", "personGeneration"], fromPersonGeneration);
  }
  if (getValueByPath(fromObject, ["pubsubTopic"]) !== void 0) {
    throw new Error("pubsubTopic parameter is not supported in Gemini API.");
  }
  const fromNegativePrompt = getValueByPath(fromObject, [
    "negativePrompt"
  ]);
  if (parentObject !== void 0 && fromNegativePrompt != null) {
    setValueByPath(parentObject, ["parameters", "negativePrompt"], fromNegativePrompt);
  }
  if (getValueByPath(fromObject, ["enhancePrompt"]) !== void 0) {
    throw new Error("enhancePrompt parameter is not supported in Gemini API.");
  }
  return toObject;
}
function generateVideosParametersToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromModel = getValueByPath(fromObject, ["model"]);
  if (fromModel != null) {
    setValueByPath(toObject, ["_url", "model"], tModel(apiClient, fromModel));
  }
  const fromPrompt = getValueByPath(fromObject, ["prompt"]);
  if (fromPrompt != null) {
    setValueByPath(toObject, ["instances[0]", "prompt"], fromPrompt);
  }
  const fromImage = getValueByPath(fromObject, ["image"]);
  if (fromImage != null) {
    setValueByPath(toObject, ["instances[0]", "image"], imageToMldev(apiClient, fromImage));
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], generateVideosConfigToMldev(apiClient, fromConfig, toObject));
  }
  return toObject;
}
function partToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromVideoMetadata = getValueByPath(fromObject, [
    "videoMetadata"
  ]);
  if (fromVideoMetadata != null) {
    setValueByPath(toObject, ["videoMetadata"], fromVideoMetadata);
  }
  const fromThought = getValueByPath(fromObject, ["thought"]);
  if (fromThought != null) {
    setValueByPath(toObject, ["thought"], fromThought);
  }
  const fromCodeExecutionResult = getValueByPath(fromObject, [
    "codeExecutionResult"
  ]);
  if (fromCodeExecutionResult != null) {
    setValueByPath(toObject, ["codeExecutionResult"], fromCodeExecutionResult);
  }
  const fromExecutableCode = getValueByPath(fromObject, [
    "executableCode"
  ]);
  if (fromExecutableCode != null) {
    setValueByPath(toObject, ["executableCode"], fromExecutableCode);
  }
  const fromFileData = getValueByPath(fromObject, ["fileData"]);
  if (fromFileData != null) {
    setValueByPath(toObject, ["fileData"], fromFileData);
  }
  const fromFunctionCall = getValueByPath(fromObject, ["functionCall"]);
  if (fromFunctionCall != null) {
    setValueByPath(toObject, ["functionCall"], fromFunctionCall);
  }
  const fromFunctionResponse = getValueByPath(fromObject, [
    "functionResponse"
  ]);
  if (fromFunctionResponse != null) {
    setValueByPath(toObject, ["functionResponse"], fromFunctionResponse);
  }
  const fromInlineData = getValueByPath(fromObject, ["inlineData"]);
  if (fromInlineData != null) {
    setValueByPath(toObject, ["inlineData"], fromInlineData);
  }
  const fromText = getValueByPath(fromObject, ["text"]);
  if (fromText != null) {
    setValueByPath(toObject, ["text"], fromText);
  }
  return toObject;
}
function contentToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromParts = getValueByPath(fromObject, ["parts"]);
  if (fromParts != null) {
    if (Array.isArray(fromParts)) {
      setValueByPath(toObject, ["parts"], fromParts.map((item) => {
        return partToVertex(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["parts"], fromParts);
    }
  }
  const fromRole = getValueByPath(fromObject, ["role"]);
  if (fromRole != null) {
    setValueByPath(toObject, ["role"], fromRole);
  }
  return toObject;
}
function schemaToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromExample = getValueByPath(fromObject, ["example"]);
  if (fromExample != null) {
    setValueByPath(toObject, ["example"], fromExample);
  }
  const fromPattern = getValueByPath(fromObject, ["pattern"]);
  if (fromPattern != null) {
    setValueByPath(toObject, ["pattern"], fromPattern);
  }
  const fromDefault = getValueByPath(fromObject, ["default"]);
  if (fromDefault != null) {
    setValueByPath(toObject, ["default"], fromDefault);
  }
  const fromMaxLength = getValueByPath(fromObject, ["maxLength"]);
  if (fromMaxLength != null) {
    setValueByPath(toObject, ["maxLength"], fromMaxLength);
  }
  const fromMinLength = getValueByPath(fromObject, ["minLength"]);
  if (fromMinLength != null) {
    setValueByPath(toObject, ["minLength"], fromMinLength);
  }
  const fromMinProperties = getValueByPath(fromObject, [
    "minProperties"
  ]);
  if (fromMinProperties != null) {
    setValueByPath(toObject, ["minProperties"], fromMinProperties);
  }
  const fromMaxProperties = getValueByPath(fromObject, [
    "maxProperties"
  ]);
  if (fromMaxProperties != null) {
    setValueByPath(toObject, ["maxProperties"], fromMaxProperties);
  }
  const fromAnyOf = getValueByPath(fromObject, ["anyOf"]);
  if (fromAnyOf != null) {
    setValueByPath(toObject, ["anyOf"], fromAnyOf);
  }
  const fromDescription = getValueByPath(fromObject, ["description"]);
  if (fromDescription != null) {
    setValueByPath(toObject, ["description"], fromDescription);
  }
  const fromEnum = getValueByPath(fromObject, ["enum"]);
  if (fromEnum != null) {
    setValueByPath(toObject, ["enum"], fromEnum);
  }
  const fromFormat = getValueByPath(fromObject, ["format"]);
  if (fromFormat != null) {
    setValueByPath(toObject, ["format"], fromFormat);
  }
  const fromItems = getValueByPath(fromObject, ["items"]);
  if (fromItems != null) {
    setValueByPath(toObject, ["items"], fromItems);
  }
  const fromMaxItems = getValueByPath(fromObject, ["maxItems"]);
  if (fromMaxItems != null) {
    setValueByPath(toObject, ["maxItems"], fromMaxItems);
  }
  const fromMaximum = getValueByPath(fromObject, ["maximum"]);
  if (fromMaximum != null) {
    setValueByPath(toObject, ["maximum"], fromMaximum);
  }
  const fromMinItems = getValueByPath(fromObject, ["minItems"]);
  if (fromMinItems != null) {
    setValueByPath(toObject, ["minItems"], fromMinItems);
  }
  const fromMinimum = getValueByPath(fromObject, ["minimum"]);
  if (fromMinimum != null) {
    setValueByPath(toObject, ["minimum"], fromMinimum);
  }
  const fromNullable = getValueByPath(fromObject, ["nullable"]);
  if (fromNullable != null) {
    setValueByPath(toObject, ["nullable"], fromNullable);
  }
  const fromProperties = getValueByPath(fromObject, ["properties"]);
  if (fromProperties != null) {
    setValueByPath(toObject, ["properties"], fromProperties);
  }
  const fromPropertyOrdering = getValueByPath(fromObject, [
    "propertyOrdering"
  ]);
  if (fromPropertyOrdering != null) {
    setValueByPath(toObject, ["propertyOrdering"], fromPropertyOrdering);
  }
  const fromRequired = getValueByPath(fromObject, ["required"]);
  if (fromRequired != null) {
    setValueByPath(toObject, ["required"], fromRequired);
  }
  const fromTitle = getValueByPath(fromObject, ["title"]);
  if (fromTitle != null) {
    setValueByPath(toObject, ["title"], fromTitle);
  }
  const fromType = getValueByPath(fromObject, ["type"]);
  if (fromType != null) {
    setValueByPath(toObject, ["type"], fromType);
  }
  return toObject;
}
function safetySettingToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromMethod = getValueByPath(fromObject, ["method"]);
  if (fromMethod != null) {
    setValueByPath(toObject, ["method"], fromMethod);
  }
  const fromCategory = getValueByPath(fromObject, ["category"]);
  if (fromCategory != null) {
    setValueByPath(toObject, ["category"], fromCategory);
  }
  const fromThreshold = getValueByPath(fromObject, ["threshold"]);
  if (fromThreshold != null) {
    setValueByPath(toObject, ["threshold"], fromThreshold);
  }
  return toObject;
}
function functionDeclarationToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromResponse = getValueByPath(fromObject, ["response"]);
  if (fromResponse != null) {
    setValueByPath(toObject, ["response"], schemaToVertex(apiClient, fromResponse));
  }
  const fromDescription = getValueByPath(fromObject, ["description"]);
  if (fromDescription != null) {
    setValueByPath(toObject, ["description"], fromDescription);
  }
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName != null) {
    setValueByPath(toObject, ["name"], fromName);
  }
  const fromParameters = getValueByPath(fromObject, ["parameters"]);
  if (fromParameters != null) {
    setValueByPath(toObject, ["parameters"], fromParameters);
  }
  return toObject;
}
function googleSearchToVertex() {
  const toObject = {};
  return toObject;
}
function dynamicRetrievalConfigToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromMode = getValueByPath(fromObject, ["mode"]);
  if (fromMode != null) {
    setValueByPath(toObject, ["mode"], fromMode);
  }
  const fromDynamicThreshold = getValueByPath(fromObject, [
    "dynamicThreshold"
  ]);
  if (fromDynamicThreshold != null) {
    setValueByPath(toObject, ["dynamicThreshold"], fromDynamicThreshold);
  }
  return toObject;
}
function googleSearchRetrievalToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromDynamicRetrievalConfig = getValueByPath(fromObject, [
    "dynamicRetrievalConfig"
  ]);
  if (fromDynamicRetrievalConfig != null) {
    setValueByPath(toObject, ["dynamicRetrievalConfig"], dynamicRetrievalConfigToVertex(apiClient, fromDynamicRetrievalConfig));
  }
  return toObject;
}
function toolToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromFunctionDeclarations = getValueByPath(fromObject, [
    "functionDeclarations"
  ]);
  if (fromFunctionDeclarations != null) {
    if (Array.isArray(fromFunctionDeclarations)) {
      setValueByPath(toObject, ["functionDeclarations"], fromFunctionDeclarations.map((item) => {
        return functionDeclarationToVertex(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["functionDeclarations"], fromFunctionDeclarations);
    }
  }
  const fromRetrieval = getValueByPath(fromObject, ["retrieval"]);
  if (fromRetrieval != null) {
    setValueByPath(toObject, ["retrieval"], fromRetrieval);
  }
  const fromGoogleSearch = getValueByPath(fromObject, ["googleSearch"]);
  if (fromGoogleSearch != null) {
    setValueByPath(toObject, ["googleSearch"], googleSearchToVertex());
  }
  const fromGoogleSearchRetrieval = getValueByPath(fromObject, [
    "googleSearchRetrieval"
  ]);
  if (fromGoogleSearchRetrieval != null) {
    setValueByPath(toObject, ["googleSearchRetrieval"], googleSearchRetrievalToVertex(apiClient, fromGoogleSearchRetrieval));
  }
  const fromCodeExecution = getValueByPath(fromObject, [
    "codeExecution"
  ]);
  if (fromCodeExecution != null) {
    setValueByPath(toObject, ["codeExecution"], fromCodeExecution);
  }
  return toObject;
}
function functionCallingConfigToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromMode = getValueByPath(fromObject, ["mode"]);
  if (fromMode != null) {
    setValueByPath(toObject, ["mode"], fromMode);
  }
  const fromAllowedFunctionNames = getValueByPath(fromObject, [
    "allowedFunctionNames"
  ]);
  if (fromAllowedFunctionNames != null) {
    setValueByPath(toObject, ["allowedFunctionNames"], fromAllowedFunctionNames);
  }
  return toObject;
}
function toolConfigToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromFunctionCallingConfig = getValueByPath(fromObject, [
    "functionCallingConfig"
  ]);
  if (fromFunctionCallingConfig != null) {
    setValueByPath(toObject, ["functionCallingConfig"], functionCallingConfigToVertex(apiClient, fromFunctionCallingConfig));
  }
  return toObject;
}
function prebuiltVoiceConfigToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromVoiceName = getValueByPath(fromObject, ["voiceName"]);
  if (fromVoiceName != null) {
    setValueByPath(toObject, ["voiceName"], fromVoiceName);
  }
  return toObject;
}
function voiceConfigToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromPrebuiltVoiceConfig = getValueByPath(fromObject, [
    "prebuiltVoiceConfig"
  ]);
  if (fromPrebuiltVoiceConfig != null) {
    setValueByPath(toObject, ["prebuiltVoiceConfig"], prebuiltVoiceConfigToVertex(apiClient, fromPrebuiltVoiceConfig));
  }
  return toObject;
}
function speechConfigToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromVoiceConfig = getValueByPath(fromObject, ["voiceConfig"]);
  if (fromVoiceConfig != null) {
    setValueByPath(toObject, ["voiceConfig"], voiceConfigToVertex(apiClient, fromVoiceConfig));
  }
  return toObject;
}
function thinkingConfigToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromIncludeThoughts = getValueByPath(fromObject, [
    "includeThoughts"
  ]);
  if (fromIncludeThoughts != null) {
    setValueByPath(toObject, ["includeThoughts"], fromIncludeThoughts);
  }
  const fromThinkingBudget = getValueByPath(fromObject, [
    "thinkingBudget"
  ]);
  if (fromThinkingBudget != null) {
    setValueByPath(toObject, ["thinkingBudget"], fromThinkingBudget);
  }
  return toObject;
}
function generateContentConfigToVertex(apiClient, fromObject, parentObject) {
  const toObject = {};
  const fromSystemInstruction = getValueByPath(fromObject, [
    "systemInstruction"
  ]);
  if (parentObject !== void 0 && fromSystemInstruction != null) {
    setValueByPath(parentObject, ["systemInstruction"], contentToVertex(apiClient, tContent(apiClient, fromSystemInstruction)));
  }
  const fromTemperature = getValueByPath(fromObject, ["temperature"]);
  if (fromTemperature != null) {
    setValueByPath(toObject, ["temperature"], fromTemperature);
  }
  const fromTopP = getValueByPath(fromObject, ["topP"]);
  if (fromTopP != null) {
    setValueByPath(toObject, ["topP"], fromTopP);
  }
  const fromTopK = getValueByPath(fromObject, ["topK"]);
  if (fromTopK != null) {
    setValueByPath(toObject, ["topK"], fromTopK);
  }
  const fromCandidateCount = getValueByPath(fromObject, [
    "candidateCount"
  ]);
  if (fromCandidateCount != null) {
    setValueByPath(toObject, ["candidateCount"], fromCandidateCount);
  }
  const fromMaxOutputTokens = getValueByPath(fromObject, [
    "maxOutputTokens"
  ]);
  if (fromMaxOutputTokens != null) {
    setValueByPath(toObject, ["maxOutputTokens"], fromMaxOutputTokens);
  }
  const fromStopSequences = getValueByPath(fromObject, [
    "stopSequences"
  ]);
  if (fromStopSequences != null) {
    setValueByPath(toObject, ["stopSequences"], fromStopSequences);
  }
  const fromResponseLogprobs = getValueByPath(fromObject, [
    "responseLogprobs"
  ]);
  if (fromResponseLogprobs != null) {
    setValueByPath(toObject, ["responseLogprobs"], fromResponseLogprobs);
  }
  const fromLogprobs = getValueByPath(fromObject, ["logprobs"]);
  if (fromLogprobs != null) {
    setValueByPath(toObject, ["logprobs"], fromLogprobs);
  }
  const fromPresencePenalty = getValueByPath(fromObject, [
    "presencePenalty"
  ]);
  if (fromPresencePenalty != null) {
    setValueByPath(toObject, ["presencePenalty"], fromPresencePenalty);
  }
  const fromFrequencyPenalty = getValueByPath(fromObject, [
    "frequencyPenalty"
  ]);
  if (fromFrequencyPenalty != null) {
    setValueByPath(toObject, ["frequencyPenalty"], fromFrequencyPenalty);
  }
  const fromSeed = getValueByPath(fromObject, ["seed"]);
  if (fromSeed != null) {
    setValueByPath(toObject, ["seed"], fromSeed);
  }
  const fromResponseMimeType = getValueByPath(fromObject, [
    "responseMimeType"
  ]);
  if (fromResponseMimeType != null) {
    setValueByPath(toObject, ["responseMimeType"], fromResponseMimeType);
  }
  const fromResponseSchema = getValueByPath(fromObject, [
    "responseSchema"
  ]);
  if (fromResponseSchema != null) {
    setValueByPath(toObject, ["responseSchema"], schemaToVertex(apiClient, tSchema(apiClient, fromResponseSchema)));
  }
  const fromRoutingConfig = getValueByPath(fromObject, [
    "routingConfig"
  ]);
  if (fromRoutingConfig != null) {
    setValueByPath(toObject, ["routingConfig"], fromRoutingConfig);
  }
  const fromSafetySettings = getValueByPath(fromObject, [
    "safetySettings"
  ]);
  if (parentObject !== void 0 && fromSafetySettings != null) {
    if (Array.isArray(fromSafetySettings)) {
      setValueByPath(parentObject, ["safetySettings"], fromSafetySettings.map((item) => {
        return safetySettingToVertex(apiClient, item);
      }));
    } else {
      setValueByPath(parentObject, ["safetySettings"], fromSafetySettings);
    }
  }
  const fromTools = getValueByPath(fromObject, ["tools"]);
  if (parentObject !== void 0 && fromTools != null) {
    if (Array.isArray(fromTools)) {
      setValueByPath(parentObject, ["tools"], tTools(apiClient, tTools(apiClient, fromTools).map((item) => {
        return toolToVertex(apiClient, tTool(apiClient, item));
      })));
    } else {
      setValueByPath(parentObject, ["tools"], tTools(apiClient, fromTools));
    }
  }
  const fromToolConfig = getValueByPath(fromObject, ["toolConfig"]);
  if (parentObject !== void 0 && fromToolConfig != null) {
    setValueByPath(parentObject, ["toolConfig"], toolConfigToVertex(apiClient, fromToolConfig));
  }
  const fromLabels = getValueByPath(fromObject, ["labels"]);
  if (parentObject !== void 0 && fromLabels != null) {
    setValueByPath(parentObject, ["labels"], fromLabels);
  }
  const fromCachedContent = getValueByPath(fromObject, [
    "cachedContent"
  ]);
  if (parentObject !== void 0 && fromCachedContent != null) {
    setValueByPath(parentObject, ["cachedContent"], tCachedContentName(apiClient, fromCachedContent));
  }
  const fromResponseModalities = getValueByPath(fromObject, [
    "responseModalities"
  ]);
  if (fromResponseModalities != null) {
    setValueByPath(toObject, ["responseModalities"], fromResponseModalities);
  }
  const fromMediaResolution = getValueByPath(fromObject, [
    "mediaResolution"
  ]);
  if (fromMediaResolution != null) {
    setValueByPath(toObject, ["mediaResolution"], fromMediaResolution);
  }
  const fromSpeechConfig = getValueByPath(fromObject, ["speechConfig"]);
  if (fromSpeechConfig != null) {
    setValueByPath(toObject, ["speechConfig"], speechConfigToVertex(apiClient, tSpeechConfig(apiClient, fromSpeechConfig)));
  }
  const fromAudioTimestamp = getValueByPath(fromObject, [
    "audioTimestamp"
  ]);
  if (fromAudioTimestamp != null) {
    setValueByPath(toObject, ["audioTimestamp"], fromAudioTimestamp);
  }
  const fromThinkingConfig = getValueByPath(fromObject, [
    "thinkingConfig"
  ]);
  if (fromThinkingConfig != null) {
    setValueByPath(toObject, ["thinkingConfig"], thinkingConfigToVertex(apiClient, fromThinkingConfig));
  }
  return toObject;
}
function generateContentParametersToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromModel = getValueByPath(fromObject, ["model"]);
  if (fromModel != null) {
    setValueByPath(toObject, ["_url", "model"], tModel(apiClient, fromModel));
  }
  const fromContents = getValueByPath(fromObject, ["contents"]);
  if (fromContents != null) {
    if (Array.isArray(fromContents)) {
      setValueByPath(toObject, ["contents"], tContents(apiClient, tContents(apiClient, fromContents).map((item) => {
        return contentToVertex(apiClient, item);
      })));
    } else {
      setValueByPath(toObject, ["contents"], tContents(apiClient, fromContents));
    }
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["generationConfig"], generateContentConfigToVertex(apiClient, fromConfig, toObject));
  }
  return toObject;
}
function embedContentConfigToVertex(apiClient, fromObject, parentObject) {
  const toObject = {};
  const fromTaskType = getValueByPath(fromObject, ["taskType"]);
  if (parentObject !== void 0 && fromTaskType != null) {
    setValueByPath(parentObject, ["instances[]", "task_type"], fromTaskType);
  }
  const fromTitle = getValueByPath(fromObject, ["title"]);
  if (parentObject !== void 0 && fromTitle != null) {
    setValueByPath(parentObject, ["instances[]", "title"], fromTitle);
  }
  const fromOutputDimensionality = getValueByPath(fromObject, [
    "outputDimensionality"
  ]);
  if (parentObject !== void 0 && fromOutputDimensionality != null) {
    setValueByPath(parentObject, ["parameters", "outputDimensionality"], fromOutputDimensionality);
  }
  const fromMimeType = getValueByPath(fromObject, ["mimeType"]);
  if (parentObject !== void 0 && fromMimeType != null) {
    setValueByPath(parentObject, ["instances[]", "mimeType"], fromMimeType);
  }
  const fromAutoTruncate = getValueByPath(fromObject, ["autoTruncate"]);
  if (parentObject !== void 0 && fromAutoTruncate != null) {
    setValueByPath(parentObject, ["parameters", "autoTruncate"], fromAutoTruncate);
  }
  return toObject;
}
function embedContentParametersToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromModel = getValueByPath(fromObject, ["model"]);
  if (fromModel != null) {
    setValueByPath(toObject, ["_url", "model"], tModel(apiClient, fromModel));
  }
  const fromContents = getValueByPath(fromObject, ["contents"]);
  if (fromContents != null) {
    setValueByPath(toObject, ["instances[]", "content"], tContentsForEmbed(apiClient, fromContents));
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], embedContentConfigToVertex(apiClient, fromConfig, toObject));
  }
  return toObject;
}
function generateImagesConfigToVertex(apiClient, fromObject, parentObject) {
  const toObject = {};
  const fromOutputGcsUri = getValueByPath(fromObject, ["outputGcsUri"]);
  if (parentObject !== void 0 && fromOutputGcsUri != null) {
    setValueByPath(parentObject, ["parameters", "storageUri"], fromOutputGcsUri);
  }
  const fromNegativePrompt = getValueByPath(fromObject, [
    "negativePrompt"
  ]);
  if (parentObject !== void 0 && fromNegativePrompt != null) {
    setValueByPath(parentObject, ["parameters", "negativePrompt"], fromNegativePrompt);
  }
  const fromNumberOfImages = getValueByPath(fromObject, [
    "numberOfImages"
  ]);
  if (parentObject !== void 0 && fromNumberOfImages != null) {
    setValueByPath(parentObject, ["parameters", "sampleCount"], fromNumberOfImages);
  }
  const fromAspectRatio = getValueByPath(fromObject, ["aspectRatio"]);
  if (parentObject !== void 0 && fromAspectRatio != null) {
    setValueByPath(parentObject, ["parameters", "aspectRatio"], fromAspectRatio);
  }
  const fromGuidanceScale = getValueByPath(fromObject, [
    "guidanceScale"
  ]);
  if (parentObject !== void 0 && fromGuidanceScale != null) {
    setValueByPath(parentObject, ["parameters", "guidanceScale"], fromGuidanceScale);
  }
  const fromSeed = getValueByPath(fromObject, ["seed"]);
  if (parentObject !== void 0 && fromSeed != null) {
    setValueByPath(parentObject, ["parameters", "seed"], fromSeed);
  }
  const fromSafetyFilterLevel = getValueByPath(fromObject, [
    "safetyFilterLevel"
  ]);
  if (parentObject !== void 0 && fromSafetyFilterLevel != null) {
    setValueByPath(parentObject, ["parameters", "safetySetting"], fromSafetyFilterLevel);
  }
  const fromPersonGeneration = getValueByPath(fromObject, [
    "personGeneration"
  ]);
  if (parentObject !== void 0 && fromPersonGeneration != null) {
    setValueByPath(parentObject, ["parameters", "personGeneration"], fromPersonGeneration);
  }
  const fromIncludeSafetyAttributes = getValueByPath(fromObject, [
    "includeSafetyAttributes"
  ]);
  if (parentObject !== void 0 && fromIncludeSafetyAttributes != null) {
    setValueByPath(parentObject, ["parameters", "includeSafetyAttributes"], fromIncludeSafetyAttributes);
  }
  const fromIncludeRaiReason = getValueByPath(fromObject, [
    "includeRaiReason"
  ]);
  if (parentObject !== void 0 && fromIncludeRaiReason != null) {
    setValueByPath(parentObject, ["parameters", "includeRaiReason"], fromIncludeRaiReason);
  }
  const fromLanguage = getValueByPath(fromObject, ["language"]);
  if (parentObject !== void 0 && fromLanguage != null) {
    setValueByPath(parentObject, ["parameters", "language"], fromLanguage);
  }
  const fromOutputMimeType = getValueByPath(fromObject, [
    "outputMimeType"
  ]);
  if (parentObject !== void 0 && fromOutputMimeType != null) {
    setValueByPath(parentObject, ["parameters", "outputOptions", "mimeType"], fromOutputMimeType);
  }
  const fromOutputCompressionQuality = getValueByPath(fromObject, [
    "outputCompressionQuality"
  ]);
  if (parentObject !== void 0 && fromOutputCompressionQuality != null) {
    setValueByPath(parentObject, ["parameters", "outputOptions", "compressionQuality"], fromOutputCompressionQuality);
  }
  const fromAddWatermark = getValueByPath(fromObject, ["addWatermark"]);
  if (parentObject !== void 0 && fromAddWatermark != null) {
    setValueByPath(parentObject, ["parameters", "addWatermark"], fromAddWatermark);
  }
  const fromEnhancePrompt = getValueByPath(fromObject, [
    "enhancePrompt"
  ]);
  if (parentObject !== void 0 && fromEnhancePrompt != null) {
    setValueByPath(parentObject, ["parameters", "enhancePrompt"], fromEnhancePrompt);
  }
  return toObject;
}
function generateImagesParametersToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromModel = getValueByPath(fromObject, ["model"]);
  if (fromModel != null) {
    setValueByPath(toObject, ["_url", "model"], tModel(apiClient, fromModel));
  }
  const fromPrompt = getValueByPath(fromObject, ["prompt"]);
  if (fromPrompt != null) {
    setValueByPath(toObject, ["instances[0]", "prompt"], fromPrompt);
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], generateImagesConfigToVertex(apiClient, fromConfig, toObject));
  }
  return toObject;
}
function getModelParametersToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromModel = getValueByPath(fromObject, ["model"]);
  if (fromModel != null) {
    setValueByPath(toObject, ["_url", "name"], tModel(apiClient, fromModel));
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], fromConfig);
  }
  return toObject;
}
function countTokensConfigToVertex(apiClient, fromObject, parentObject) {
  const toObject = {};
  const fromSystemInstruction = getValueByPath(fromObject, [
    "systemInstruction"
  ]);
  if (parentObject !== void 0 && fromSystemInstruction != null) {
    setValueByPath(parentObject, ["systemInstruction"], contentToVertex(apiClient, tContent(apiClient, fromSystemInstruction)));
  }
  const fromTools = getValueByPath(fromObject, ["tools"]);
  if (parentObject !== void 0 && fromTools != null) {
    if (Array.isArray(fromTools)) {
      setValueByPath(parentObject, ["tools"], fromTools.map((item) => {
        return toolToVertex(apiClient, item);
      }));
    } else {
      setValueByPath(parentObject, ["tools"], fromTools);
    }
  }
  const fromGenerationConfig = getValueByPath(fromObject, [
    "generationConfig"
  ]);
  if (parentObject !== void 0 && fromGenerationConfig != null) {
    setValueByPath(parentObject, ["generationConfig"], fromGenerationConfig);
  }
  return toObject;
}
function countTokensParametersToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromModel = getValueByPath(fromObject, ["model"]);
  if (fromModel != null) {
    setValueByPath(toObject, ["_url", "model"], tModel(apiClient, fromModel));
  }
  const fromContents = getValueByPath(fromObject, ["contents"]);
  if (fromContents != null) {
    if (Array.isArray(fromContents)) {
      setValueByPath(toObject, ["contents"], tContents(apiClient, tContents(apiClient, fromContents).map((item) => {
        return contentToVertex(apiClient, item);
      })));
    } else {
      setValueByPath(toObject, ["contents"], tContents(apiClient, fromContents));
    }
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], countTokensConfigToVertex(apiClient, fromConfig, toObject));
  }
  return toObject;
}
function computeTokensParametersToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromModel = getValueByPath(fromObject, ["model"]);
  if (fromModel != null) {
    setValueByPath(toObject, ["_url", "model"], tModel(apiClient, fromModel));
  }
  const fromContents = getValueByPath(fromObject, ["contents"]);
  if (fromContents != null) {
    if (Array.isArray(fromContents)) {
      setValueByPath(toObject, ["contents"], tContents(apiClient, tContents(apiClient, fromContents).map((item) => {
        return contentToVertex(apiClient, item);
      })));
    } else {
      setValueByPath(toObject, ["contents"], tContents(apiClient, fromContents));
    }
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], fromConfig);
  }
  return toObject;
}
function imageToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromGcsUri = getValueByPath(fromObject, ["gcsUri"]);
  if (fromGcsUri != null) {
    setValueByPath(toObject, ["gcsUri"], fromGcsUri);
  }
  const fromImageBytes = getValueByPath(fromObject, ["imageBytes"]);
  if (fromImageBytes != null) {
    setValueByPath(toObject, ["bytesBase64Encoded"], tBytes(apiClient, fromImageBytes));
  }
  const fromMimeType = getValueByPath(fromObject, ["mimeType"]);
  if (fromMimeType != null) {
    setValueByPath(toObject, ["mimeType"], fromMimeType);
  }
  return toObject;
}
function generateVideosConfigToVertex(apiClient, fromObject, parentObject) {
  const toObject = {};
  const fromNumberOfVideos = getValueByPath(fromObject, [
    "numberOfVideos"
  ]);
  if (parentObject !== void 0 && fromNumberOfVideos != null) {
    setValueByPath(parentObject, ["parameters", "sampleCount"], fromNumberOfVideos);
  }
  const fromOutputGcsUri = getValueByPath(fromObject, ["outputGcsUri"]);
  if (parentObject !== void 0 && fromOutputGcsUri != null) {
    setValueByPath(parentObject, ["parameters", "storageUri"], fromOutputGcsUri);
  }
  const fromFps = getValueByPath(fromObject, ["fps"]);
  if (parentObject !== void 0 && fromFps != null) {
    setValueByPath(parentObject, ["parameters", "fps"], fromFps);
  }
  const fromDurationSeconds = getValueByPath(fromObject, [
    "durationSeconds"
  ]);
  if (parentObject !== void 0 && fromDurationSeconds != null) {
    setValueByPath(parentObject, ["parameters", "durationSeconds"], fromDurationSeconds);
  }
  const fromSeed = getValueByPath(fromObject, ["seed"]);
  if (parentObject !== void 0 && fromSeed != null) {
    setValueByPath(parentObject, ["parameters", "seed"], fromSeed);
  }
  const fromAspectRatio = getValueByPath(fromObject, ["aspectRatio"]);
  if (parentObject !== void 0 && fromAspectRatio != null) {
    setValueByPath(parentObject, ["parameters", "aspectRatio"], fromAspectRatio);
  }
  const fromResolution = getValueByPath(fromObject, ["resolution"]);
  if (parentObject !== void 0 && fromResolution != null) {
    setValueByPath(parentObject, ["parameters", "resolution"], fromResolution);
  }
  const fromPersonGeneration = getValueByPath(fromObject, [
    "personGeneration"
  ]);
  if (parentObject !== void 0 && fromPersonGeneration != null) {
    setValueByPath(parentObject, ["parameters", "personGeneration"], fromPersonGeneration);
  }
  const fromPubsubTopic = getValueByPath(fromObject, ["pubsubTopic"]);
  if (parentObject !== void 0 && fromPubsubTopic != null) {
    setValueByPath(parentObject, ["parameters", "pubsubTopic"], fromPubsubTopic);
  }
  const fromNegativePrompt = getValueByPath(fromObject, [
    "negativePrompt"
  ]);
  if (parentObject !== void 0 && fromNegativePrompt != null) {
    setValueByPath(parentObject, ["parameters", "negativePrompt"], fromNegativePrompt);
  }
  const fromEnhancePrompt = getValueByPath(fromObject, [
    "enhancePrompt"
  ]);
  if (parentObject !== void 0 && fromEnhancePrompt != null) {
    setValueByPath(parentObject, ["parameters", "enhancePrompt"], fromEnhancePrompt);
  }
  return toObject;
}
function generateVideosParametersToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromModel = getValueByPath(fromObject, ["model"]);
  if (fromModel != null) {
    setValueByPath(toObject, ["_url", "model"], tModel(apiClient, fromModel));
  }
  const fromPrompt = getValueByPath(fromObject, ["prompt"]);
  if (fromPrompt != null) {
    setValueByPath(toObject, ["instances[0]", "prompt"], fromPrompt);
  }
  const fromImage = getValueByPath(fromObject, ["image"]);
  if (fromImage != null) {
    setValueByPath(toObject, ["instances[0]", "image"], imageToVertex(apiClient, fromImage));
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], generateVideosConfigToVertex(apiClient, fromConfig, toObject));
  }
  return toObject;
}
function partFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromThought = getValueByPath(fromObject, ["thought"]);
  if (fromThought != null) {
    setValueByPath(toObject, ["thought"], fromThought);
  }
  const fromCodeExecutionResult = getValueByPath(fromObject, [
    "codeExecutionResult"
  ]);
  if (fromCodeExecutionResult != null) {
    setValueByPath(toObject, ["codeExecutionResult"], fromCodeExecutionResult);
  }
  const fromExecutableCode = getValueByPath(fromObject, [
    "executableCode"
  ]);
  if (fromExecutableCode != null) {
    setValueByPath(toObject, ["executableCode"], fromExecutableCode);
  }
  const fromFileData = getValueByPath(fromObject, ["fileData"]);
  if (fromFileData != null) {
    setValueByPath(toObject, ["fileData"], fromFileData);
  }
  const fromFunctionCall = getValueByPath(fromObject, ["functionCall"]);
  if (fromFunctionCall != null) {
    setValueByPath(toObject, ["functionCall"], fromFunctionCall);
  }
  const fromFunctionResponse = getValueByPath(fromObject, [
    "functionResponse"
  ]);
  if (fromFunctionResponse != null) {
    setValueByPath(toObject, ["functionResponse"], fromFunctionResponse);
  }
  const fromInlineData = getValueByPath(fromObject, ["inlineData"]);
  if (fromInlineData != null) {
    setValueByPath(toObject, ["inlineData"], fromInlineData);
  }
  const fromText = getValueByPath(fromObject, ["text"]);
  if (fromText != null) {
    setValueByPath(toObject, ["text"], fromText);
  }
  return toObject;
}
function contentFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromParts = getValueByPath(fromObject, ["parts"]);
  if (fromParts != null) {
    if (Array.isArray(fromParts)) {
      setValueByPath(toObject, ["parts"], fromParts.map((item) => {
        return partFromMldev(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["parts"], fromParts);
    }
  }
  const fromRole = getValueByPath(fromObject, ["role"]);
  if (fromRole != null) {
    setValueByPath(toObject, ["role"], fromRole);
  }
  return toObject;
}
function citationMetadataFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromCitations = getValueByPath(fromObject, ["citationSources"]);
  if (fromCitations != null) {
    setValueByPath(toObject, ["citations"], fromCitations);
  }
  return toObject;
}
function candidateFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromContent = getValueByPath(fromObject, ["content"]);
  if (fromContent != null) {
    setValueByPath(toObject, ["content"], contentFromMldev(apiClient, fromContent));
  }
  const fromCitationMetadata = getValueByPath(fromObject, [
    "citationMetadata"
  ]);
  if (fromCitationMetadata != null) {
    setValueByPath(toObject, ["citationMetadata"], citationMetadataFromMldev(apiClient, fromCitationMetadata));
  }
  const fromTokenCount = getValueByPath(fromObject, ["tokenCount"]);
  if (fromTokenCount != null) {
    setValueByPath(toObject, ["tokenCount"], fromTokenCount);
  }
  const fromFinishReason = getValueByPath(fromObject, ["finishReason"]);
  if (fromFinishReason != null) {
    setValueByPath(toObject, ["finishReason"], fromFinishReason);
  }
  const fromAvgLogprobs = getValueByPath(fromObject, ["avgLogprobs"]);
  if (fromAvgLogprobs != null) {
    setValueByPath(toObject, ["avgLogprobs"], fromAvgLogprobs);
  }
  const fromGroundingMetadata = getValueByPath(fromObject, [
    "groundingMetadata"
  ]);
  if (fromGroundingMetadata != null) {
    setValueByPath(toObject, ["groundingMetadata"], fromGroundingMetadata);
  }
  const fromIndex = getValueByPath(fromObject, ["index"]);
  if (fromIndex != null) {
    setValueByPath(toObject, ["index"], fromIndex);
  }
  const fromLogprobsResult = getValueByPath(fromObject, [
    "logprobsResult"
  ]);
  if (fromLogprobsResult != null) {
    setValueByPath(toObject, ["logprobsResult"], fromLogprobsResult);
  }
  const fromSafetyRatings = getValueByPath(fromObject, [
    "safetyRatings"
  ]);
  if (fromSafetyRatings != null) {
    setValueByPath(toObject, ["safetyRatings"], fromSafetyRatings);
  }
  return toObject;
}
function generateContentResponseFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromCandidates = getValueByPath(fromObject, ["candidates"]);
  if (fromCandidates != null) {
    if (Array.isArray(fromCandidates)) {
      setValueByPath(toObject, ["candidates"], fromCandidates.map((item) => {
        return candidateFromMldev(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["candidates"], fromCandidates);
    }
  }
  const fromModelVersion = getValueByPath(fromObject, ["modelVersion"]);
  if (fromModelVersion != null) {
    setValueByPath(toObject, ["modelVersion"], fromModelVersion);
  }
  const fromPromptFeedback = getValueByPath(fromObject, [
    "promptFeedback"
  ]);
  if (fromPromptFeedback != null) {
    setValueByPath(toObject, ["promptFeedback"], fromPromptFeedback);
  }
  const fromUsageMetadata = getValueByPath(fromObject, [
    "usageMetadata"
  ]);
  if (fromUsageMetadata != null) {
    setValueByPath(toObject, ["usageMetadata"], fromUsageMetadata);
  }
  return toObject;
}
function contentEmbeddingFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromValues = getValueByPath(fromObject, ["values"]);
  if (fromValues != null) {
    setValueByPath(toObject, ["values"], fromValues);
  }
  return toObject;
}
function embedContentMetadataFromMldev() {
  const toObject = {};
  return toObject;
}
function embedContentResponseFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromEmbeddings = getValueByPath(fromObject, ["embeddings"]);
  if (fromEmbeddings != null) {
    if (Array.isArray(fromEmbeddings)) {
      setValueByPath(toObject, ["embeddings"], fromEmbeddings.map((item) => {
        return contentEmbeddingFromMldev(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["embeddings"], fromEmbeddings);
    }
  }
  const fromMetadata = getValueByPath(fromObject, ["metadata"]);
  if (fromMetadata != null) {
    setValueByPath(toObject, ["metadata"], embedContentMetadataFromMldev());
  }
  return toObject;
}
function imageFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromImageBytes = getValueByPath(fromObject, [
    "bytesBase64Encoded"
  ]);
  if (fromImageBytes != null) {
    setValueByPath(toObject, ["imageBytes"], tBytes(apiClient, fromImageBytes));
  }
  const fromMimeType = getValueByPath(fromObject, ["mimeType"]);
  if (fromMimeType != null) {
    setValueByPath(toObject, ["mimeType"], fromMimeType);
  }
  return toObject;
}
function safetyAttributesFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromCategories = getValueByPath(fromObject, [
    "safetyAttributes",
    "categories"
  ]);
  if (fromCategories != null) {
    setValueByPath(toObject, ["categories"], fromCategories);
  }
  const fromScores = getValueByPath(fromObject, [
    "safetyAttributes",
    "scores"
  ]);
  if (fromScores != null) {
    setValueByPath(toObject, ["scores"], fromScores);
  }
  const fromContentType = getValueByPath(fromObject, ["contentType"]);
  if (fromContentType != null) {
    setValueByPath(toObject, ["contentType"], fromContentType);
  }
  return toObject;
}
function generatedImageFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromImage = getValueByPath(fromObject, ["_self"]);
  if (fromImage != null) {
    setValueByPath(toObject, ["image"], imageFromMldev(apiClient, fromImage));
  }
  const fromRaiFilteredReason = getValueByPath(fromObject, [
    "raiFilteredReason"
  ]);
  if (fromRaiFilteredReason != null) {
    setValueByPath(toObject, ["raiFilteredReason"], fromRaiFilteredReason);
  }
  const fromSafetyAttributes = getValueByPath(fromObject, ["_self"]);
  if (fromSafetyAttributes != null) {
    setValueByPath(toObject, ["safetyAttributes"], safetyAttributesFromMldev(apiClient, fromSafetyAttributes));
  }
  return toObject;
}
function generateImagesResponseFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromGeneratedImages = getValueByPath(fromObject, [
    "predictions"
  ]);
  if (fromGeneratedImages != null) {
    if (Array.isArray(fromGeneratedImages)) {
      setValueByPath(toObject, ["generatedImages"], fromGeneratedImages.map((item) => {
        return generatedImageFromMldev(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["generatedImages"], fromGeneratedImages);
    }
  }
  const fromPositivePromptSafetyAttributes = getValueByPath(fromObject, [
    "positivePromptSafetyAttributes"
  ]);
  if (fromPositivePromptSafetyAttributes != null) {
    setValueByPath(toObject, ["positivePromptSafetyAttributes"], safetyAttributesFromMldev(apiClient, fromPositivePromptSafetyAttributes));
  }
  return toObject;
}
function tunedModelInfoFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromBaseModel = getValueByPath(fromObject, ["baseModel"]);
  if (fromBaseModel != null) {
    setValueByPath(toObject, ["baseModel"], fromBaseModel);
  }
  const fromCreateTime = getValueByPath(fromObject, ["createTime"]);
  if (fromCreateTime != null) {
    setValueByPath(toObject, ["createTime"], fromCreateTime);
  }
  const fromUpdateTime = getValueByPath(fromObject, ["updateTime"]);
  if (fromUpdateTime != null) {
    setValueByPath(toObject, ["updateTime"], fromUpdateTime);
  }
  return toObject;
}
function modelFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName != null) {
    setValueByPath(toObject, ["name"], fromName);
  }
  const fromDisplayName = getValueByPath(fromObject, ["displayName"]);
  if (fromDisplayName != null) {
    setValueByPath(toObject, ["displayName"], fromDisplayName);
  }
  const fromDescription = getValueByPath(fromObject, ["description"]);
  if (fromDescription != null) {
    setValueByPath(toObject, ["description"], fromDescription);
  }
  const fromVersion = getValueByPath(fromObject, ["version"]);
  if (fromVersion != null) {
    setValueByPath(toObject, ["version"], fromVersion);
  }
  const fromTunedModelInfo = getValueByPath(fromObject, ["_self"]);
  if (fromTunedModelInfo != null) {
    setValueByPath(toObject, ["tunedModelInfo"], tunedModelInfoFromMldev(apiClient, fromTunedModelInfo));
  }
  const fromInputTokenLimit = getValueByPath(fromObject, [
    "inputTokenLimit"
  ]);
  if (fromInputTokenLimit != null) {
    setValueByPath(toObject, ["inputTokenLimit"], fromInputTokenLimit);
  }
  const fromOutputTokenLimit = getValueByPath(fromObject, [
    "outputTokenLimit"
  ]);
  if (fromOutputTokenLimit != null) {
    setValueByPath(toObject, ["outputTokenLimit"], fromOutputTokenLimit);
  }
  const fromSupportedActions = getValueByPath(fromObject, [
    "supportedGenerationMethods"
  ]);
  if (fromSupportedActions != null) {
    setValueByPath(toObject, ["supportedActions"], fromSupportedActions);
  }
  return toObject;
}
function countTokensResponseFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromTotalTokens = getValueByPath(fromObject, ["totalTokens"]);
  if (fromTotalTokens != null) {
    setValueByPath(toObject, ["totalTokens"], fromTotalTokens);
  }
  const fromCachedContentTokenCount = getValueByPath(fromObject, [
    "cachedContentTokenCount"
  ]);
  if (fromCachedContentTokenCount != null) {
    setValueByPath(toObject, ["cachedContentTokenCount"], fromCachedContentTokenCount);
  }
  return toObject;
}
function videoFromMldev$1(apiClient, fromObject) {
  const toObject = {};
  const fromUri = getValueByPath(fromObject, ["video", "uri"]);
  if (fromUri != null) {
    setValueByPath(toObject, ["uri"], fromUri);
  }
  const fromVideoBytes = getValueByPath(fromObject, [
    "video",
    "encodedVideo"
  ]);
  if (fromVideoBytes != null) {
    setValueByPath(toObject, ["videoBytes"], tBytes(apiClient, fromVideoBytes));
  }
  const fromMimeType = getValueByPath(fromObject, ["encoding"]);
  if (fromMimeType != null) {
    setValueByPath(toObject, ["mimeType"], fromMimeType);
  }
  return toObject;
}
function generatedVideoFromMldev$1(apiClient, fromObject) {
  const toObject = {};
  const fromVideo = getValueByPath(fromObject, ["_self"]);
  if (fromVideo != null) {
    setValueByPath(toObject, ["video"], videoFromMldev$1(apiClient, fromVideo));
  }
  return toObject;
}
function generateVideosResponseFromMldev$1(apiClient, fromObject) {
  const toObject = {};
  const fromGeneratedVideos = getValueByPath(fromObject, [
    "generatedSamples"
  ]);
  if (fromGeneratedVideos != null) {
    if (Array.isArray(fromGeneratedVideos)) {
      setValueByPath(toObject, ["generatedVideos"], fromGeneratedVideos.map((item) => {
        return generatedVideoFromMldev$1(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["generatedVideos"], fromGeneratedVideos);
    }
  }
  const fromRaiMediaFilteredCount = getValueByPath(fromObject, [
    "raiMediaFilteredCount"
  ]);
  if (fromRaiMediaFilteredCount != null) {
    setValueByPath(toObject, ["raiMediaFilteredCount"], fromRaiMediaFilteredCount);
  }
  const fromRaiMediaFilteredReasons = getValueByPath(fromObject, [
    "raiMediaFilteredReasons"
  ]);
  if (fromRaiMediaFilteredReasons != null) {
    setValueByPath(toObject, ["raiMediaFilteredReasons"], fromRaiMediaFilteredReasons);
  }
  return toObject;
}
function generateVideosOperationFromMldev$1(apiClient, fromObject) {
  const toObject = {};
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName != null) {
    setValueByPath(toObject, ["name"], fromName);
  }
  const fromMetadata = getValueByPath(fromObject, ["metadata"]);
  if (fromMetadata != null) {
    setValueByPath(toObject, ["metadata"], fromMetadata);
  }
  const fromDone = getValueByPath(fromObject, ["done"]);
  if (fromDone != null) {
    setValueByPath(toObject, ["done"], fromDone);
  }
  const fromError = getValueByPath(fromObject, ["error"]);
  if (fromError != null) {
    setValueByPath(toObject, ["error"], fromError);
  }
  const fromResponse = getValueByPath(fromObject, [
    "response",
    "generateVideoResponse"
  ]);
  if (fromResponse != null) {
    setValueByPath(toObject, ["response"], generateVideosResponseFromMldev$1(apiClient, fromResponse));
  }
  const fromResult = getValueByPath(fromObject, [
    "response",
    "generateVideoResponse"
  ]);
  if (fromResult != null) {
    setValueByPath(toObject, ["result"], generateVideosResponseFromMldev$1(apiClient, fromResult));
  }
  return toObject;
}
function partFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromVideoMetadata = getValueByPath(fromObject, [
    "videoMetadata"
  ]);
  if (fromVideoMetadata != null) {
    setValueByPath(toObject, ["videoMetadata"], fromVideoMetadata);
  }
  const fromThought = getValueByPath(fromObject, ["thought"]);
  if (fromThought != null) {
    setValueByPath(toObject, ["thought"], fromThought);
  }
  const fromCodeExecutionResult = getValueByPath(fromObject, [
    "codeExecutionResult"
  ]);
  if (fromCodeExecutionResult != null) {
    setValueByPath(toObject, ["codeExecutionResult"], fromCodeExecutionResult);
  }
  const fromExecutableCode = getValueByPath(fromObject, [
    "executableCode"
  ]);
  if (fromExecutableCode != null) {
    setValueByPath(toObject, ["executableCode"], fromExecutableCode);
  }
  const fromFileData = getValueByPath(fromObject, ["fileData"]);
  if (fromFileData != null) {
    setValueByPath(toObject, ["fileData"], fromFileData);
  }
  const fromFunctionCall = getValueByPath(fromObject, ["functionCall"]);
  if (fromFunctionCall != null) {
    setValueByPath(toObject, ["functionCall"], fromFunctionCall);
  }
  const fromFunctionResponse = getValueByPath(fromObject, [
    "functionResponse"
  ]);
  if (fromFunctionResponse != null) {
    setValueByPath(toObject, ["functionResponse"], fromFunctionResponse);
  }
  const fromInlineData = getValueByPath(fromObject, ["inlineData"]);
  if (fromInlineData != null) {
    setValueByPath(toObject, ["inlineData"], fromInlineData);
  }
  const fromText = getValueByPath(fromObject, ["text"]);
  if (fromText != null) {
    setValueByPath(toObject, ["text"], fromText);
  }
  return toObject;
}
function contentFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromParts = getValueByPath(fromObject, ["parts"]);
  if (fromParts != null) {
    if (Array.isArray(fromParts)) {
      setValueByPath(toObject, ["parts"], fromParts.map((item) => {
        return partFromVertex(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["parts"], fromParts);
    }
  }
  const fromRole = getValueByPath(fromObject, ["role"]);
  if (fromRole != null) {
    setValueByPath(toObject, ["role"], fromRole);
  }
  return toObject;
}
function citationMetadataFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromCitations = getValueByPath(fromObject, ["citations"]);
  if (fromCitations != null) {
    setValueByPath(toObject, ["citations"], fromCitations);
  }
  return toObject;
}
function candidateFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromContent = getValueByPath(fromObject, ["content"]);
  if (fromContent != null) {
    setValueByPath(toObject, ["content"], contentFromVertex(apiClient, fromContent));
  }
  const fromCitationMetadata = getValueByPath(fromObject, [
    "citationMetadata"
  ]);
  if (fromCitationMetadata != null) {
    setValueByPath(toObject, ["citationMetadata"], citationMetadataFromVertex(apiClient, fromCitationMetadata));
  }
  const fromFinishMessage = getValueByPath(fromObject, [
    "finishMessage"
  ]);
  if (fromFinishMessage != null) {
    setValueByPath(toObject, ["finishMessage"], fromFinishMessage);
  }
  const fromFinishReason = getValueByPath(fromObject, ["finishReason"]);
  if (fromFinishReason != null) {
    setValueByPath(toObject, ["finishReason"], fromFinishReason);
  }
  const fromAvgLogprobs = getValueByPath(fromObject, ["avgLogprobs"]);
  if (fromAvgLogprobs != null) {
    setValueByPath(toObject, ["avgLogprobs"], fromAvgLogprobs);
  }
  const fromGroundingMetadata = getValueByPath(fromObject, [
    "groundingMetadata"
  ]);
  if (fromGroundingMetadata != null) {
    setValueByPath(toObject, ["groundingMetadata"], fromGroundingMetadata);
  }
  const fromIndex = getValueByPath(fromObject, ["index"]);
  if (fromIndex != null) {
    setValueByPath(toObject, ["index"], fromIndex);
  }
  const fromLogprobsResult = getValueByPath(fromObject, [
    "logprobsResult"
  ]);
  if (fromLogprobsResult != null) {
    setValueByPath(toObject, ["logprobsResult"], fromLogprobsResult);
  }
  const fromSafetyRatings = getValueByPath(fromObject, [
    "safetyRatings"
  ]);
  if (fromSafetyRatings != null) {
    setValueByPath(toObject, ["safetyRatings"], fromSafetyRatings);
  }
  return toObject;
}
function generateContentResponseFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromCandidates = getValueByPath(fromObject, ["candidates"]);
  if (fromCandidates != null) {
    if (Array.isArray(fromCandidates)) {
      setValueByPath(toObject, ["candidates"], fromCandidates.map((item) => {
        return candidateFromVertex(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["candidates"], fromCandidates);
    }
  }
  const fromCreateTime = getValueByPath(fromObject, ["createTime"]);
  if (fromCreateTime != null) {
    setValueByPath(toObject, ["createTime"], fromCreateTime);
  }
  const fromResponseId = getValueByPath(fromObject, ["responseId"]);
  if (fromResponseId != null) {
    setValueByPath(toObject, ["responseId"], fromResponseId);
  }
  const fromModelVersion = getValueByPath(fromObject, ["modelVersion"]);
  if (fromModelVersion != null) {
    setValueByPath(toObject, ["modelVersion"], fromModelVersion);
  }
  const fromPromptFeedback = getValueByPath(fromObject, [
    "promptFeedback"
  ]);
  if (fromPromptFeedback != null) {
    setValueByPath(toObject, ["promptFeedback"], fromPromptFeedback);
  }
  const fromUsageMetadata = getValueByPath(fromObject, [
    "usageMetadata"
  ]);
  if (fromUsageMetadata != null) {
    setValueByPath(toObject, ["usageMetadata"], fromUsageMetadata);
  }
  return toObject;
}
function contentEmbeddingStatisticsFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromTruncated = getValueByPath(fromObject, ["truncated"]);
  if (fromTruncated != null) {
    setValueByPath(toObject, ["truncated"], fromTruncated);
  }
  const fromTokenCount = getValueByPath(fromObject, ["token_count"]);
  if (fromTokenCount != null) {
    setValueByPath(toObject, ["tokenCount"], fromTokenCount);
  }
  return toObject;
}
function contentEmbeddingFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromValues = getValueByPath(fromObject, ["values"]);
  if (fromValues != null) {
    setValueByPath(toObject, ["values"], fromValues);
  }
  const fromStatistics = getValueByPath(fromObject, ["statistics"]);
  if (fromStatistics != null) {
    setValueByPath(toObject, ["statistics"], contentEmbeddingStatisticsFromVertex(apiClient, fromStatistics));
  }
  return toObject;
}
function embedContentMetadataFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromBillableCharacterCount = getValueByPath(fromObject, [
    "billableCharacterCount"
  ]);
  if (fromBillableCharacterCount != null) {
    setValueByPath(toObject, ["billableCharacterCount"], fromBillableCharacterCount);
  }
  return toObject;
}
function embedContentResponseFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromEmbeddings = getValueByPath(fromObject, [
    "predictions[]",
    "embeddings"
  ]);
  if (fromEmbeddings != null) {
    if (Array.isArray(fromEmbeddings)) {
      setValueByPath(toObject, ["embeddings"], fromEmbeddings.map((item) => {
        return contentEmbeddingFromVertex(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["embeddings"], fromEmbeddings);
    }
  }
  const fromMetadata = getValueByPath(fromObject, ["metadata"]);
  if (fromMetadata != null) {
    setValueByPath(toObject, ["metadata"], embedContentMetadataFromVertex(apiClient, fromMetadata));
  }
  return toObject;
}
function imageFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromGcsUri = getValueByPath(fromObject, ["gcsUri"]);
  if (fromGcsUri != null) {
    setValueByPath(toObject, ["gcsUri"], fromGcsUri);
  }
  const fromImageBytes = getValueByPath(fromObject, [
    "bytesBase64Encoded"
  ]);
  if (fromImageBytes != null) {
    setValueByPath(toObject, ["imageBytes"], tBytes(apiClient, fromImageBytes));
  }
  const fromMimeType = getValueByPath(fromObject, ["mimeType"]);
  if (fromMimeType != null) {
    setValueByPath(toObject, ["mimeType"], fromMimeType);
  }
  return toObject;
}
function safetyAttributesFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromCategories = getValueByPath(fromObject, [
    "safetyAttributes",
    "categories"
  ]);
  if (fromCategories != null) {
    setValueByPath(toObject, ["categories"], fromCategories);
  }
  const fromScores = getValueByPath(fromObject, [
    "safetyAttributes",
    "scores"
  ]);
  if (fromScores != null) {
    setValueByPath(toObject, ["scores"], fromScores);
  }
  const fromContentType = getValueByPath(fromObject, ["contentType"]);
  if (fromContentType != null) {
    setValueByPath(toObject, ["contentType"], fromContentType);
  }
  return toObject;
}
function generatedImageFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromImage = getValueByPath(fromObject, ["_self"]);
  if (fromImage != null) {
    setValueByPath(toObject, ["image"], imageFromVertex(apiClient, fromImage));
  }
  const fromRaiFilteredReason = getValueByPath(fromObject, [
    "raiFilteredReason"
  ]);
  if (fromRaiFilteredReason != null) {
    setValueByPath(toObject, ["raiFilteredReason"], fromRaiFilteredReason);
  }
  const fromSafetyAttributes = getValueByPath(fromObject, ["_self"]);
  if (fromSafetyAttributes != null) {
    setValueByPath(toObject, ["safetyAttributes"], safetyAttributesFromVertex(apiClient, fromSafetyAttributes));
  }
  const fromEnhancedPrompt = getValueByPath(fromObject, ["prompt"]);
  if (fromEnhancedPrompt != null) {
    setValueByPath(toObject, ["enhancedPrompt"], fromEnhancedPrompt);
  }
  return toObject;
}
function generateImagesResponseFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromGeneratedImages = getValueByPath(fromObject, [
    "predictions"
  ]);
  if (fromGeneratedImages != null) {
    if (Array.isArray(fromGeneratedImages)) {
      setValueByPath(toObject, ["generatedImages"], fromGeneratedImages.map((item) => {
        return generatedImageFromVertex(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["generatedImages"], fromGeneratedImages);
    }
  }
  const fromPositivePromptSafetyAttributes = getValueByPath(fromObject, [
    "positivePromptSafetyAttributes"
  ]);
  if (fromPositivePromptSafetyAttributes != null) {
    setValueByPath(toObject, ["positivePromptSafetyAttributes"], safetyAttributesFromVertex(apiClient, fromPositivePromptSafetyAttributes));
  }
  return toObject;
}
function endpointFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromName = getValueByPath(fromObject, ["endpoint"]);
  if (fromName != null) {
    setValueByPath(toObject, ["name"], fromName);
  }
  const fromDeployedModelId = getValueByPath(fromObject, [
    "deployedModelId"
  ]);
  if (fromDeployedModelId != null) {
    setValueByPath(toObject, ["deployedModelId"], fromDeployedModelId);
  }
  return toObject;
}
function tunedModelInfoFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromBaseModel = getValueByPath(fromObject, [
    "labels",
    "google-vertex-llm-tuning-base-model-id"
  ]);
  if (fromBaseModel != null) {
    setValueByPath(toObject, ["baseModel"], fromBaseModel);
  }
  const fromCreateTime = getValueByPath(fromObject, ["createTime"]);
  if (fromCreateTime != null) {
    setValueByPath(toObject, ["createTime"], fromCreateTime);
  }
  const fromUpdateTime = getValueByPath(fromObject, ["updateTime"]);
  if (fromUpdateTime != null) {
    setValueByPath(toObject, ["updateTime"], fromUpdateTime);
  }
  return toObject;
}
function modelFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName != null) {
    setValueByPath(toObject, ["name"], fromName);
  }
  const fromDisplayName = getValueByPath(fromObject, ["displayName"]);
  if (fromDisplayName != null) {
    setValueByPath(toObject, ["displayName"], fromDisplayName);
  }
  const fromDescription = getValueByPath(fromObject, ["description"]);
  if (fromDescription != null) {
    setValueByPath(toObject, ["description"], fromDescription);
  }
  const fromVersion = getValueByPath(fromObject, ["versionId"]);
  if (fromVersion != null) {
    setValueByPath(toObject, ["version"], fromVersion);
  }
  const fromEndpoints = getValueByPath(fromObject, ["deployedModels"]);
  if (fromEndpoints != null) {
    if (Array.isArray(fromEndpoints)) {
      setValueByPath(toObject, ["endpoints"], fromEndpoints.map((item) => {
        return endpointFromVertex(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["endpoints"], fromEndpoints);
    }
  }
  const fromLabels = getValueByPath(fromObject, ["labels"]);
  if (fromLabels != null) {
    setValueByPath(toObject, ["labels"], fromLabels);
  }
  const fromTunedModelInfo = getValueByPath(fromObject, ["_self"]);
  if (fromTunedModelInfo != null) {
    setValueByPath(toObject, ["tunedModelInfo"], tunedModelInfoFromVertex(apiClient, fromTunedModelInfo));
  }
  return toObject;
}
function countTokensResponseFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromTotalTokens = getValueByPath(fromObject, ["totalTokens"]);
  if (fromTotalTokens != null) {
    setValueByPath(toObject, ["totalTokens"], fromTotalTokens);
  }
  return toObject;
}
function computeTokensResponseFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromTokensInfo = getValueByPath(fromObject, ["tokensInfo"]);
  if (fromTokensInfo != null) {
    setValueByPath(toObject, ["tokensInfo"], fromTokensInfo);
  }
  return toObject;
}
function videoFromVertex$1(apiClient, fromObject) {
  const toObject = {};
  const fromUri = getValueByPath(fromObject, ["gcsUri"]);
  if (fromUri != null) {
    setValueByPath(toObject, ["uri"], fromUri);
  }
  const fromVideoBytes = getValueByPath(fromObject, [
    "bytesBase64Encoded"
  ]);
  if (fromVideoBytes != null) {
    setValueByPath(toObject, ["videoBytes"], tBytes(apiClient, fromVideoBytes));
  }
  const fromMimeType = getValueByPath(fromObject, ["mimeType"]);
  if (fromMimeType != null) {
    setValueByPath(toObject, ["mimeType"], fromMimeType);
  }
  return toObject;
}
function generatedVideoFromVertex$1(apiClient, fromObject) {
  const toObject = {};
  const fromVideo = getValueByPath(fromObject, ["_self"]);
  if (fromVideo != null) {
    setValueByPath(toObject, ["video"], videoFromVertex$1(apiClient, fromVideo));
  }
  return toObject;
}
function generateVideosResponseFromVertex$1(apiClient, fromObject) {
  const toObject = {};
  const fromGeneratedVideos = getValueByPath(fromObject, ["videos"]);
  if (fromGeneratedVideos != null) {
    if (Array.isArray(fromGeneratedVideos)) {
      setValueByPath(toObject, ["generatedVideos"], fromGeneratedVideos.map((item) => {
        return generatedVideoFromVertex$1(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["generatedVideos"], fromGeneratedVideos);
    }
  }
  const fromRaiMediaFilteredCount = getValueByPath(fromObject, [
    "raiMediaFilteredCount"
  ]);
  if (fromRaiMediaFilteredCount != null) {
    setValueByPath(toObject, ["raiMediaFilteredCount"], fromRaiMediaFilteredCount);
  }
  const fromRaiMediaFilteredReasons = getValueByPath(fromObject, [
    "raiMediaFilteredReasons"
  ]);
  if (fromRaiMediaFilteredReasons != null) {
    setValueByPath(toObject, ["raiMediaFilteredReasons"], fromRaiMediaFilteredReasons);
  }
  return toObject;
}
function generateVideosOperationFromVertex$1(apiClient, fromObject) {
  const toObject = {};
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName != null) {
    setValueByPath(toObject, ["name"], fromName);
  }
  const fromMetadata = getValueByPath(fromObject, ["metadata"]);
  if (fromMetadata != null) {
    setValueByPath(toObject, ["metadata"], fromMetadata);
  }
  const fromDone = getValueByPath(fromObject, ["done"]);
  if (fromDone != null) {
    setValueByPath(toObject, ["done"], fromDone);
  }
  const fromError = getValueByPath(fromObject, ["error"]);
  if (fromError != null) {
    setValueByPath(toObject, ["error"], fromError);
  }
  const fromResponse = getValueByPath(fromObject, ["response"]);
  if (fromResponse != null) {
    setValueByPath(toObject, ["response"], generateVideosResponseFromVertex$1(apiClient, fromResponse));
  }
  const fromResult = getValueByPath(fromObject, ["response"]);
  if (fromResult != null) {
    setValueByPath(toObject, ["result"], generateVideosResponseFromVertex$1(apiClient, fromResult));
  }
  return toObject;
}
function liveConnectParametersToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig !== void 0 && fromConfig !== null) {
    setValueByPath(toObject, ["setup"], liveConnectConfigToMldev(apiClient, fromConfig));
  }
  const fromModel = getValueByPath(fromObject, ["model"]);
  if (fromModel !== void 0) {
    setValueByPath(toObject, ["setup", "model"], fromModel);
  }
  return toObject;
}
function liveConnectParametersToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig !== void 0 && fromConfig !== null) {
    setValueByPath(toObject, ["setup"], liveConnectConfigToVertex(apiClient, fromConfig));
  }
  const fromModel = getValueByPath(fromObject, ["model"]);
  if (fromModel !== void 0) {
    setValueByPath(toObject, ["setup", "model"], fromModel);
  }
  return toObject;
}
function liveServerMessageFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromSetupComplete = getValueByPath(fromObject, [
    "setupComplete"
  ]);
  if (fromSetupComplete !== void 0) {
    setValueByPath(toObject, ["setupComplete"], fromSetupComplete);
  }
  const fromServerContent = getValueByPath(fromObject, [
    "serverContent"
  ]);
  if (fromServerContent !== void 0 && fromServerContent !== null) {
    setValueByPath(toObject, ["serverContent"], liveServerContentFromMldev(apiClient, fromServerContent));
  }
  const fromToolCall = getValueByPath(fromObject, ["toolCall"]);
  if (fromToolCall !== void 0 && fromToolCall !== null) {
    setValueByPath(toObject, ["toolCall"], liveServerToolCallFromMldev(apiClient, fromToolCall));
  }
  const fromToolCallCancellation = getValueByPath(fromObject, [
    "toolCallCancellation"
  ]);
  if (fromToolCallCancellation !== void 0 && fromToolCallCancellation !== null) {
    setValueByPath(toObject, ["toolCallCancellation"], liveServerToolCallCancellationFromMldev(apiClient, fromToolCallCancellation));
  }
  const fromUsageMetadata = getValueByPath(fromObject, [
    "usageMetadata"
  ]);
  if (fromUsageMetadata != void 0 && fromUsageMetadata != null) {
    setValueByPath(toObject, ["usageMetadata"], usageMetadataFromMldev(apiClient, fromUsageMetadata));
  }
  const fromGoAway = getValueByPath(fromObject, ["goAway"]);
  if (fromGoAway !== void 0 && fromGoAway !== null) {
    setValueByPath(toObject, ["goAway"], liveServerGoAwayFromMldev(fromGoAway));
  }
  const fromSessionResumptionUpdate = getValueByPath(fromObject, [
    "sessionResumptionUpdate"
  ]);
  if (fromSessionResumptionUpdate !== void 0 && fromSessionResumptionUpdate !== null) {
    setValueByPath(toObject, ["sessionResumptionUpdate"], liveServerSessionResumptionUpdateFromMldev(fromSessionResumptionUpdate));
  }
  return toObject;
}
function liveServerMessageFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromSetupComplete = getValueByPath(fromObject, [
    "setupComplete"
  ]);
  if (fromSetupComplete !== void 0) {
    setValueByPath(toObject, ["setupComplete"], fromSetupComplete);
  }
  const fromServerContent = getValueByPath(fromObject, [
    "serverContent"
  ]);
  if (fromServerContent !== void 0 && fromServerContent !== null) {
    setValueByPath(toObject, ["serverContent"], liveServerContentFromVertex(apiClient, fromServerContent));
  }
  const fromToolCall = getValueByPath(fromObject, ["toolCall"]);
  if (fromToolCall !== void 0 && fromToolCall !== null) {
    setValueByPath(toObject, ["toolCall"], liveServerToolCallFromVertex(apiClient, fromToolCall));
  }
  const fromToolCallCancellation = getValueByPath(fromObject, [
    "toolCallCancellation"
  ]);
  if (fromToolCallCancellation !== void 0 && fromToolCallCancellation !== null) {
    setValueByPath(toObject, ["toolCallCancellation"], liveServerToolCallCancellationFromVertex(apiClient, fromToolCallCancellation));
  }
  const fromGoAway = getValueByPath(fromObject, ["goAway"]);
  if (fromGoAway !== void 0 && fromGoAway !== null) {
    setValueByPath(toObject, ["goAway"], liveServerGoAwayFromVertex(fromGoAway));
  }
  const fromSessionResumptionUpdate = getValueByPath(fromObject, [
    "sessionResumptionUpdate"
  ]);
  if (fromSessionResumptionUpdate !== void 0 && fromSessionResumptionUpdate !== null) {
    setValueByPath(toObject, ["sessionResumptionUpdate"], liveServerSessionResumptionUpdateFromVertex(fromSessionResumptionUpdate));
  }
  const fromUsageMetadata = getValueByPath(fromObject, [
    "usageMetadata"
  ]);
  if (fromUsageMetadata != void 0 && fromUsageMetadata != null) {
    setValueByPath(toObject, ["usageMetadata"], usageMetadataFromVertex(apiClient, fromUsageMetadata));
  }
  return toObject;
}
function slidingWindowToMldev(fromObject) {
  const toObject = {};
  const fromTargetTokens = getValueByPath(fromObject, ["targetTokens"]);
  if (fromTargetTokens !== void 0 && fromTargetTokens !== null) {
    setValueByPath(toObject, ["targetTokens"], fromTargetTokens);
  }
  return toObject;
}
function slidingWindowToVertex(fromObject) {
  const toObject = {};
  const fromTargetTokens = getValueByPath(fromObject, ["targetTokens"]);
  if (fromTargetTokens !== void 0 && fromTargetTokens !== null) {
    setValueByPath(toObject, ["targetTokens"], fromTargetTokens);
  }
  return toObject;
}
function contextWindowCompressionToMldev(fromObject) {
  const toObject = {};
  const fromTriggerTokens = getValueByPath(fromObject, [
    "triggerTokens"
  ]);
  if (fromTriggerTokens !== void 0 && fromTriggerTokens !== null) {
    setValueByPath(toObject, ["triggerTokens"], fromTriggerTokens);
  }
  const fromSlidingWindow = getValueByPath(fromObject, [
    "slidingWindow"
  ]);
  if (fromSlidingWindow !== void 0 && fromSlidingWindow !== null) {
    setValueByPath(toObject, ["slidingWindow"], slidingWindowToMldev(fromSlidingWindow));
  }
  return toObject;
}
function contextWindowCompressionToVertex(fromObject) {
  const toObject = {};
  const fromTriggerTokens = getValueByPath(fromObject, [
    "triggerTokens"
  ]);
  if (fromTriggerTokens !== void 0 && fromTriggerTokens !== null) {
    setValueByPath(toObject, ["triggerTokens"], fromTriggerTokens);
  }
  const fromSlidingWindow = getValueByPath(fromObject, [
    "slidingWindow"
  ]);
  if (fromSlidingWindow !== void 0 && fromSlidingWindow !== null) {
    setValueByPath(toObject, ["slidingWindow"], slidingWindowToVertex(fromSlidingWindow));
  }
  return toObject;
}
function automaticActivityDetectionToMldev(fromObject) {
  const toObject = {};
  const fromDisabled = getValueByPath(fromObject, ["disabled"]);
  if (fromDisabled !== void 0 && fromDisabled !== null) {
    setValueByPath(toObject, ["disabled"], fromDisabled);
  }
  const fromStartOfSpeechSensitivity = getValueByPath(fromObject, [
    "startOfSpeechSensitivity"
  ]);
  if (fromStartOfSpeechSensitivity !== void 0 && fromStartOfSpeechSensitivity !== null) {
    setValueByPath(toObject, ["startOfSpeechSensitivity"], fromStartOfSpeechSensitivity);
  }
  const fromEndOfSpeechSensitivity = getValueByPath(fromObject, [
    "endOfSpeechSensitivity"
  ]);
  if (fromEndOfSpeechSensitivity !== void 0 && fromEndOfSpeechSensitivity !== null) {
    setValueByPath(toObject, ["endOfSpeechSensitivity"], fromEndOfSpeechSensitivity);
  }
  const fromPrefixPaddingMs = getValueByPath(fromObject, [
    "prefixPaddingMs"
  ]);
  if (fromPrefixPaddingMs !== void 0 && fromPrefixPaddingMs !== null) {
    setValueByPath(toObject, ["prefixPaddingMs"], fromPrefixPaddingMs);
  }
  const fromSilenceDurationMs = getValueByPath(fromObject, [
    "silenceDurationMs"
  ]);
  if (fromSilenceDurationMs !== void 0 && fromSilenceDurationMs !== null) {
    setValueByPath(toObject, ["silenceDurationMs"], fromSilenceDurationMs);
  }
  return toObject;
}
function automaticActivityDetectionToVertex(fromObject) {
  const toObject = {};
  const fromDisabled = getValueByPath(fromObject, ["disabled"]);
  if (fromDisabled !== void 0 && fromDisabled !== null) {
    setValueByPath(toObject, ["disabled"], fromDisabled);
  }
  const fromStartOfSpeechSensitivity = getValueByPath(fromObject, [
    "startOfSpeechSensitivity"
  ]);
  if (fromStartOfSpeechSensitivity !== void 0 && fromStartOfSpeechSensitivity !== null) {
    setValueByPath(toObject, ["startOfSpeechSensitivity"], fromStartOfSpeechSensitivity);
  }
  const fromEndOfSpeechSensitivity = getValueByPath(fromObject, [
    "endOfSpeechSensitivity"
  ]);
  if (fromEndOfSpeechSensitivity !== void 0 && fromEndOfSpeechSensitivity !== null) {
    setValueByPath(toObject, ["endOfSpeechSensitivity"], fromEndOfSpeechSensitivity);
  }
  const fromPrefixPaddingMs = getValueByPath(fromObject, [
    "prefixPaddingMs"
  ]);
  if (fromPrefixPaddingMs !== void 0 && fromPrefixPaddingMs !== null) {
    setValueByPath(toObject, ["prefixPaddingMs"], fromPrefixPaddingMs);
  }
  const fromSilenceDurationMs = getValueByPath(fromObject, [
    "silenceDurationMs"
  ]);
  if (fromSilenceDurationMs !== void 0 && fromSilenceDurationMs !== null) {
    setValueByPath(toObject, ["silenceDurationMs"], fromSilenceDurationMs);
  }
  return toObject;
}
function realtimeInputConfigToMldev(fromObject) {
  const toObject = {};
  const fromAutomaticActivityDetection = getValueByPath(fromObject, [
    "automaticActivityDetection"
  ]);
  if (fromAutomaticActivityDetection !== void 0 && fromAutomaticActivityDetection !== null) {
    setValueByPath(toObject, ["automaticActivityDetection"], automaticActivityDetectionToMldev(fromAutomaticActivityDetection));
  }
  const fromActivityHandling = getValueByPath(fromObject, [
    "activityHandling"
  ]);
  if (fromActivityHandling !== void 0 && fromActivityHandling !== null) {
    setValueByPath(toObject, ["activityHandling"], fromActivityHandling);
  }
  const fromTurnCoverage = getValueByPath(fromObject, ["turnCoverage"]);
  if (fromTurnCoverage !== void 0 && fromTurnCoverage !== null) {
    setValueByPath(toObject, ["turnCoverage"], fromTurnCoverage);
  }
  return toObject;
}
function realtimeInputConfigToVertex(fromObject) {
  const toObject = {};
  const fromAutomaticActivityDetection = getValueByPath(fromObject, [
    "automaticActivityDetection"
  ]);
  if (fromAutomaticActivityDetection !== void 0 && fromAutomaticActivityDetection !== null) {
    setValueByPath(toObject, ["automaticActivityDetection"], automaticActivityDetectionToVertex(fromAutomaticActivityDetection));
  }
  const fromActivityHandling = getValueByPath(fromObject, [
    "activityHandling"
  ]);
  if (fromActivityHandling !== void 0 && fromActivityHandling !== null) {
    setValueByPath(toObject, ["activityHandling"], fromActivityHandling);
  }
  const fromTurnCoverage = getValueByPath(fromObject, ["turnCoverage"]);
  if (fromTurnCoverage !== void 0 && fromTurnCoverage !== null) {
    setValueByPath(toObject, ["turnCoverage"], fromTurnCoverage);
  }
  return toObject;
}
function liveConnectConfigToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromGenerationConfig = getValueByPath(fromObject, [
    "generationConfig"
  ]);
  if (fromGenerationConfig !== void 0) {
    setValueByPath(toObject, ["generationConfig"], fromGenerationConfig);
  }
  const fromResponseModalities = getValueByPath(fromObject, [
    "responseModalities"
  ]);
  if (fromResponseModalities !== void 0) {
    setValueByPath(toObject, ["generationConfig", "responseModalities"], fromResponseModalities);
  }
  const fromSpeechConfig = getValueByPath(fromObject, ["speechConfig"]);
  if (fromSpeechConfig !== void 0) {
    setValueByPath(toObject, ["generationConfig", "speechConfig"], fromSpeechConfig);
  }
  const fromSystemInstruction = getValueByPath(fromObject, [
    "systemInstruction"
  ]);
  if (fromSystemInstruction !== void 0 && fromSystemInstruction !== null) {
    setValueByPath(toObject, ["systemInstruction"], contentToMldev(apiClient, fromSystemInstruction));
  }
  const fromTools = getValueByPath(fromObject, ["tools"]);
  if (fromTools !== void 0 && fromTools !== null && Array.isArray(fromTools)) {
    setValueByPath(toObject, ["tools"], fromTools.map((item) => {
      return toolToMldev(apiClient, item);
    }));
  }
  const fromSessionResumption = getValueByPath(fromObject, [
    "sessionResumption"
  ]);
  if (fromSessionResumption !== void 0 && fromSessionResumption !== null) {
    setValueByPath(toObject, ["sessionResumption"], liveClientSessionResumptionConfigToMldev(fromSessionResumption));
  }
  const fromContextWindowCompression = getValueByPath(fromObject, [
    "contextWindowCompression"
  ]);
  if (fromContextWindowCompression !== void 0 && fromContextWindowCompression !== null) {
    setValueByPath(toObject, ["contextWindowCompression"], contextWindowCompressionToMldev(fromContextWindowCompression));
  }
  const fromRealtimeInputConfig = getValueByPath(fromObject, [
    "realtimeInputConfig"
  ]);
  if (fromRealtimeInputConfig !== void 0 && fromRealtimeInputConfig !== null) {
    setValueByPath(toObject, ["realtimeInputConfig"], realtimeInputConfigToMldev(fromRealtimeInputConfig));
  }
  return toObject;
}
function liveConnectConfigToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromGenerationConfig = getValueByPath(fromObject, [
    "generationConfig"
  ]);
  if (fromGenerationConfig !== void 0) {
    setValueByPath(toObject, ["generationConfig"], fromGenerationConfig);
  }
  const fromResponseModalities = getValueByPath(fromObject, [
    "responseModalities"
  ]);
  if (fromResponseModalities !== void 0) {
    setValueByPath(toObject, ["generationConfig", "responseModalities"], fromResponseModalities);
  } else {
    setValueByPath(toObject, ["generationConfig", "responseModalities"], ["AUDIO"]);
  }
  const fromSpeechConfig = getValueByPath(fromObject, ["speechConfig"]);
  if (fromSpeechConfig !== void 0) {
    setValueByPath(toObject, ["generationConfig", "speechConfig"], fromSpeechConfig);
  }
  const fromSystemInstruction = getValueByPath(fromObject, [
    "systemInstruction"
  ]);
  if (fromSystemInstruction !== void 0 && fromSystemInstruction !== null) {
    setValueByPath(toObject, ["systemInstruction"], contentToVertex(apiClient, fromSystemInstruction));
  }
  const fromTools = getValueByPath(fromObject, ["tools"]);
  if (fromTools !== void 0 && fromTools !== null && Array.isArray(fromTools)) {
    setValueByPath(toObject, ["tools"], fromTools.map((item) => {
      return toolToVertex(apiClient, item);
    }));
  }
  const fromSessionResumption = getValueByPath(fromObject, [
    "sessionResumption"
  ]);
  if (fromSessionResumption !== void 0 && fromSessionResumption !== null) {
    setValueByPath(toObject, ["sessionResumption"], liveClientSessionResumptionConfigToVertex(fromSessionResumption));
  }
  const fromContextWindowCompression = getValueByPath(fromObject, [
    "contextWindowCompression"
  ]);
  if (fromContextWindowCompression !== void 0 && fromContextWindowCompression !== null) {
    setValueByPath(toObject, ["contextWindowCompression"], contextWindowCompressionToVertex(fromContextWindowCompression));
  }
  const fromRealtimeInputConfig = getValueByPath(fromObject, [
    "realtimeInputConfig"
  ]);
  if (fromRealtimeInputConfig !== void 0 && fromRealtimeInputConfig !== null) {
    setValueByPath(toObject, ["realtimeInputConfig"], realtimeInputConfigToVertex(fromRealtimeInputConfig));
  }
  return toObject;
}
function liveServerContentFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromModelTurn = getValueByPath(fromObject, ["modelTurn"]);
  if (fromModelTurn !== void 0 && fromModelTurn !== null) {
    setValueByPath(toObject, ["modelTurn"], contentFromMldev(apiClient, fromModelTurn));
  }
  const fromTurnComplete = getValueByPath(fromObject, ["turnComplete"]);
  if (fromTurnComplete !== void 0) {
    setValueByPath(toObject, ["turnComplete"], fromTurnComplete);
  }
  const fromInterrupted = getValueByPath(fromObject, ["interrupted"]);
  if (fromInterrupted !== void 0) {
    setValueByPath(toObject, ["interrupted"], fromInterrupted);
  }
  const fromGenerationComplete = getValueByPath(fromObject, [
    "generationComplete"
  ]);
  if (fromGenerationComplete != null) {
    setValueByPath(toObject, ["generationComplete"], fromGenerationComplete);
  }
  return toObject;
}
function liveServerContentFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromModelTurn = getValueByPath(fromObject, ["modelTurn"]);
  if (fromModelTurn !== void 0 && fromModelTurn !== null) {
    setValueByPath(toObject, ["modelTurn"], contentFromVertex(apiClient, fromModelTurn));
  }
  const fromTurnComplete = getValueByPath(fromObject, ["turnComplete"]);
  if (fromTurnComplete !== void 0) {
    setValueByPath(toObject, ["turnComplete"], fromTurnComplete);
  }
  const fromInterrupted = getValueByPath(fromObject, ["interrupted"]);
  if (fromInterrupted !== void 0) {
    setValueByPath(toObject, ["interrupted"], fromInterrupted);
  }
  const fromGenerationComplete = getValueByPath(fromObject, [
    "generationComplete"
  ]);
  if (fromGenerationComplete != null) {
    setValueByPath(toObject, ["generationComplete"], fromGenerationComplete);
  }
  return toObject;
}
function functionCallFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromId = getValueByPath(fromObject, ["id"]);
  if (fromId !== void 0) {
    setValueByPath(toObject, ["id"], fromId);
  }
  const fromArgs = getValueByPath(fromObject, ["args"]);
  if (fromArgs !== void 0) {
    setValueByPath(toObject, ["args"], fromArgs);
  }
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName !== void 0) {
    setValueByPath(toObject, ["name"], fromName);
  }
  return toObject;
}
function functionCallFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromArgs = getValueByPath(fromObject, ["args"]);
  if (fromArgs !== void 0) {
    setValueByPath(toObject, ["args"], fromArgs);
  }
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName !== void 0) {
    setValueByPath(toObject, ["name"], fromName);
  }
  return toObject;
}
function liveServerToolCallFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromFunctionCalls = getValueByPath(fromObject, [
    "functionCalls"
  ]);
  if (fromFunctionCalls !== void 0 && fromFunctionCalls !== null && Array.isArray(fromFunctionCalls)) {
    setValueByPath(toObject, ["functionCalls"], fromFunctionCalls.map((item) => {
      return functionCallFromMldev(apiClient, item);
    }));
  }
  return toObject;
}
function liveServerToolCallFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromFunctionCalls = getValueByPath(fromObject, [
    "functionCalls"
  ]);
  if (fromFunctionCalls !== void 0 && fromFunctionCalls !== null && Array.isArray(fromFunctionCalls)) {
    setValueByPath(toObject, ["functionCalls"], fromFunctionCalls.map((item) => {
      return functionCallFromVertex(apiClient, item);
    }));
  }
  return toObject;
}
function liveServerToolCallCancellationFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromIds = getValueByPath(fromObject, ["ids"]);
  if (fromIds !== void 0) {
    setValueByPath(toObject, ["ids"], fromIds);
  }
  return toObject;
}
function liveServerToolCallCancellationFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromIds = getValueByPath(fromObject, ["ids"]);
  if (fromIds !== void 0) {
    setValueByPath(toObject, ["ids"], fromIds);
  }
  return toObject;
}
function liveServerGoAwayFromMldev(fromObject) {
  const toObject = {};
  const fromTimeLeft = getValueByPath(fromObject, ["timeLeft"]);
  if (fromTimeLeft !== void 0) {
    setValueByPath(toObject, ["timeLeft"], fromTimeLeft);
  }
  return toObject;
}
function liveServerGoAwayFromVertex(fromObject) {
  const toObject = {};
  const fromTimeLeft = getValueByPath(fromObject, ["timeLeft"]);
  if (fromTimeLeft !== void 0) {
    setValueByPath(toObject, ["timeLeft"], fromTimeLeft);
  }
  return toObject;
}
function liveServerSessionResumptionUpdateFromMldev(fromObject) {
  const toObject = {};
  const fromNewHandle = getValueByPath(fromObject, ["newHandle"]);
  if (fromNewHandle !== void 0) {
    setValueByPath(toObject, ["newHandle"], fromNewHandle);
  }
  const fromResumable = getValueByPath(fromObject, ["resumable"]);
  if (fromResumable !== void 0) {
    setValueByPath(toObject, ["resumable"], fromResumable);
  }
  const fromLastConsumedClientMessageIndex = getValueByPath(fromObject, [
    "lastConsumedClientMessageIndex"
  ]);
  if (fromLastConsumedClientMessageIndex !== void 0) {
    setValueByPath(toObject, ["lastConsumedClientMessageIndex"], fromLastConsumedClientMessageIndex);
  }
  return toObject;
}
function liveServerSessionResumptionUpdateFromVertex(fromObject) {
  const toObject = {};
  const fromNewHandle = getValueByPath(fromObject, ["newHandle"]);
  if (fromNewHandle !== void 0) {
    setValueByPath(toObject, ["newHandle"], fromNewHandle);
  }
  const fromResumable = getValueByPath(fromObject, ["resumable"]);
  if (fromResumable !== void 0) {
    setValueByPath(toObject, ["resumable"], fromResumable);
  }
  const fromLastConsumedClientMessageIndex = getValueByPath(fromObject, [
    "lastConsumedClientMessageIndex"
  ]);
  if (fromLastConsumedClientMessageIndex !== void 0) {
    setValueByPath(toObject, ["lastConsumedClientMessageIndex"], fromLastConsumedClientMessageIndex);
  }
  return toObject;
}
function liveClientSessionResumptionConfigToMldev(fromObject) {
  const toObject = {};
  const fromHandle = getValueByPath(fromObject, ["handle"]);
  if (fromHandle !== void 0) {
    setValueByPath(toObject, ["handle"], fromHandle);
  }
  if (getValueByPath(fromObject, ["transparent"]) !== void 0) {
    throw new Error("transparent parameter is not supported in Gemini API.");
  }
  return toObject;
}
function liveClientSessionResumptionConfigToVertex(fromObject) {
  const toObject = {};
  const fromHandle = getValueByPath(fromObject, ["handle"]);
  if (fromHandle !== void 0) {
    setValueByPath(toObject, ["handle"], fromHandle);
  }
  const fromTransparent = getValueByPath(fromObject, ["transparent"]);
  if (fromTransparent !== void 0) {
    setValueByPath(toObject, ["transparent"], fromTransparent);
  }
  return toObject;
}
function modalityTokenCountFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromModality = getValueByPath(fromObject, ["modality"]);
  if (fromModality != null) {
    setValueByPath(toObject, ["modality"], fromModality);
  }
  const fromTokenCount = getValueByPath(fromObject, ["tokenCount"]);
  if (fromTokenCount != null) {
    setValueByPath(toObject, ["tokenCount"], fromTokenCount);
  }
  return toObject;
}
function usageMetadataFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromPromptTokenCount = getValueByPath(fromObject, [
    "promptTokenCount"
  ]);
  if (fromPromptTokenCount != null) {
    setValueByPath(toObject, ["promptTokenCount"], fromPromptTokenCount);
  }
  const fromCachedContentTokenCount = getValueByPath(fromObject, [
    "cachedContentTokenCount"
  ]);
  if (fromCachedContentTokenCount != null) {
    setValueByPath(toObject, ["cachedContentTokenCount"], fromCachedContentTokenCount);
  }
  const fromResponseTokenCount = getValueByPath(fromObject, [
    "responseTokenCount"
  ]);
  if (fromResponseTokenCount != null) {
    setValueByPath(toObject, ["responseTokenCount"], fromResponseTokenCount);
  }
  const fromToolUsePromptTokenCount = getValueByPath(fromObject, [
    "toolUsePromptTokenCount"
  ]);
  if (fromToolUsePromptTokenCount != null) {
    setValueByPath(toObject, ["toolUsePromptTokenCount"], fromToolUsePromptTokenCount);
  }
  const fromThoughtsTokenCount = getValueByPath(fromObject, [
    "thoughtsTokenCount"
  ]);
  if (fromThoughtsTokenCount != null) {
    setValueByPath(toObject, ["thoughtsTokenCount"], fromThoughtsTokenCount);
  }
  const fromTotalTokenCount = getValueByPath(fromObject, [
    "totalTokenCount"
  ]);
  if (fromTotalTokenCount != null) {
    setValueByPath(toObject, ["totalTokenCount"], fromTotalTokenCount);
  }
  const fromPromptTokensDetails = getValueByPath(fromObject, [
    "promptTokensDetails"
  ]);
  if (fromPromptTokensDetails != null) {
    if (Array.isArray(fromPromptTokensDetails)) {
      setValueByPath(toObject, ["promptTokensDetails"], fromPromptTokensDetails.map((item) => {
        return modalityTokenCountFromMldev(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["promptTokensDetails"], fromPromptTokensDetails);
    }
  }
  const fromCacheTokensDetails = getValueByPath(fromObject, [
    "cacheTokensDetails"
  ]);
  if (fromCacheTokensDetails != null) {
    if (Array.isArray(fromCacheTokensDetails)) {
      setValueByPath(toObject, ["cacheTokensDetails"], fromCacheTokensDetails.map((item) => {
        return modalityTokenCountFromMldev(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["cacheTokensDetails"], fromCacheTokensDetails);
    }
  }
  const fromResponseTokensDetails = getValueByPath(fromObject, [
    "responseTokensDetails"
  ]);
  if (fromResponseTokensDetails != null) {
    if (Array.isArray(fromResponseTokensDetails)) {
      setValueByPath(toObject, ["responseTokensDetails"], fromResponseTokensDetails.map((item) => {
        return modalityTokenCountFromMldev(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["responseTokensDetails"], fromResponseTokensDetails);
    }
  }
  const fromToolUsePromptTokensDetails = getValueByPath(fromObject, [
    "toolUsePromptTokensDetails"
  ]);
  if (fromToolUsePromptTokensDetails != null) {
    if (Array.isArray(fromToolUsePromptTokensDetails)) {
      setValueByPath(toObject, ["toolUsePromptTokensDetails"], fromToolUsePromptTokensDetails.map((item) => {
        return modalityTokenCountFromMldev(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["toolUsePromptTokensDetails"], fromToolUsePromptTokensDetails);
    }
  }
  return toObject;
}
function modalityTokenCountFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromModality = getValueByPath(fromObject, ["modality"]);
  if (fromModality != null) {
    setValueByPath(toObject, ["modality"], fromModality);
  }
  const fromTokenCount = getValueByPath(fromObject, ["tokenCount"]);
  if (fromTokenCount != null) {
    setValueByPath(toObject, ["tokenCount"], fromTokenCount);
  }
  return toObject;
}
function usageMetadataFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromPromptTokenCount = getValueByPath(fromObject, [
    "promptTokenCount"
  ]);
  if (fromPromptTokenCount != null) {
    setValueByPath(toObject, ["promptTokenCount"], fromPromptTokenCount);
  }
  const fromCachedContentTokenCount = getValueByPath(fromObject, [
    "cachedContentTokenCount"
  ]);
  if (fromCachedContentTokenCount != null) {
    setValueByPath(toObject, ["cachedContentTokenCount"], fromCachedContentTokenCount);
  }
  const fromResponseTokenCount = getValueByPath(fromObject, [
    "candidatesTokenCount"
  ]);
  if (fromResponseTokenCount != null) {
    setValueByPath(toObject, ["responseTokenCount"], fromResponseTokenCount);
  }
  const fromToolUsePromptTokenCount = getValueByPath(fromObject, [
    "toolUsePromptTokenCount"
  ]);
  if (fromToolUsePromptTokenCount != null) {
    setValueByPath(toObject, ["toolUsePromptTokenCount"], fromToolUsePromptTokenCount);
  }
  const fromThoughtsTokenCount = getValueByPath(fromObject, [
    "thoughtsTokenCount"
  ]);
  if (fromThoughtsTokenCount != null) {
    setValueByPath(toObject, ["thoughtsTokenCount"], fromThoughtsTokenCount);
  }
  const fromTotalTokenCount = getValueByPath(fromObject, [
    "totalTokenCount"
  ]);
  if (fromTotalTokenCount != null) {
    setValueByPath(toObject, ["totalTokenCount"], fromTotalTokenCount);
  }
  const fromPromptTokensDetails = getValueByPath(fromObject, [
    "promptTokensDetails"
  ]);
  if (fromPromptTokensDetails != null) {
    if (Array.isArray(fromPromptTokensDetails)) {
      setValueByPath(toObject, ["promptTokensDetails"], fromPromptTokensDetails.map((item) => {
        return modalityTokenCountFromVertex(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["promptTokensDetails"], fromPromptTokensDetails);
    }
  }
  const fromCacheTokensDetails = getValueByPath(fromObject, [
    "cacheTokensDetails"
  ]);
  if (fromCacheTokensDetails != null) {
    if (Array.isArray(fromCacheTokensDetails)) {
      setValueByPath(toObject, ["cacheTokensDetails"], fromCacheTokensDetails.map((item) => {
        return modalityTokenCountFromVertex(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["cacheTokensDetails"], fromCacheTokensDetails);
    }
  }
  const fromToolUsePromptTokensDetails = getValueByPath(fromObject, [
    "toolUsePromptTokensDetails"
  ]);
  if (fromToolUsePromptTokensDetails != null) {
    if (Array.isArray(fromToolUsePromptTokensDetails)) {
      setValueByPath(toObject, ["toolUsePromptTokensDetails"], fromToolUsePromptTokensDetails.map((item) => {
        return modalityTokenCountFromVertex(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["toolUsePromptTokensDetails"], fromToolUsePromptTokensDetails);
    }
  }
  const fromResponseTokensDetails = getValueByPath(fromObject, [
    "candidatesTokensDetails"
  ]);
  if (fromResponseTokensDetails != null) {
    if (Array.isArray(fromResponseTokensDetails)) {
      setValueByPath(toObject, ["responseTokensDetails"], fromResponseTokensDetails.map((item) => {
        return modalityTokenCountFromVertex(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["responseTokensDetails"], fromResponseTokensDetails);
    }
  }
  const fromTrafficType = getValueByPath(fromObject, ["trafficType"]);
  if (fromTrafficType != null) {
    setValueByPath(toObject, ["trafficType"], fromTrafficType);
  }
  return toObject;
}
var FUNCTION_RESPONSE_REQUIRES_ID = "FunctionResponse request must have an `id` field from the response of a ToolCall.FunctionalCalls in Google AI.";
async function handleWebSocketMessage(apiClient, onmessage, event) {
  let serverMessage;
  let data;
  if (event.data instanceof Blob) {
    data = JSON.parse(await event.data.text());
  } else {
    data = JSON.parse(event.data);
  }
  if (apiClient.isVertexAI()) {
    serverMessage = liveServerMessageFromVertex(apiClient, data);
  } else {
    serverMessage = liveServerMessageFromMldev(apiClient, data);
  }
  onmessage(serverMessage);
}
var Live = class {
  constructor(apiClient, auth, webSocketFactory) {
    this.apiClient = apiClient;
    this.auth = auth;
    this.webSocketFactory = webSocketFactory;
  }
  /**
       Establishes a connection to the specified model with the given
       configuration and returns a Session object representing that connection.
  
       @experimental
  
       @remarks
       If using the Gemini API, Live is currently only supported behind API
       version `v1alpha`. Ensure that the API version is set to `v1alpha` when
       initializing the SDK if relying on the Gemini API.
  
       @param params - The parameters for establishing a connection to the model.
       @return A live session.
  
       @example
       ```ts
       const session = await ai.live.connect({
         model: 'gemini-2.0-flash-exp',
         config: {
           responseModalities: [Modality.AUDIO],
         },
         callbacks: {
           onopen: () => {
             console.log('Connected to the socket.');
           },
           onmessage: (e: MessageEvent) => {
             console.log('Received message from the server: %s\n', debug(e.data));
           },
           onerror: (e: ErrorEvent) => {
             console.log('Error occurred: %s\n', debug(e.error));
           },
           onclose: (e: CloseEvent) => {
             console.log('Connection closed.');
           },
         },
       });
       ```
      */
  async connect(params) {
    var _a, _b;
    const websocketBaseUrl = this.apiClient.getWebsocketBaseUrl();
    const apiVersion = this.apiClient.getApiVersion();
    let url;
    const headers = mapToHeaders(this.apiClient.getDefaultHeaders());
    if (this.apiClient.isVertexAI()) {
      url = `${websocketBaseUrl}/ws/google.cloud.aiplatform.${apiVersion}.LlmBidiService/BidiGenerateContent`;
      await this.auth.addAuthHeaders(headers);
    } else {
      const apiKey = this.apiClient.getApiKey();
      url = `${websocketBaseUrl}/ws/google.ai.generativelanguage.${apiVersion}.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    }
    let onopenResolve = () => {
    };
    const onopenPromise = new Promise((resolve) => {
      onopenResolve = resolve;
    });
    const callbacks = params.callbacks;
    const onopenAwaitedCallback = function() {
      var _a2;
      (_a2 = callbacks === null || callbacks === void 0 ? void 0 : callbacks.onopen) === null || _a2 === void 0 ? void 0 : _a2.call(callbacks);
      onopenResolve({});
    };
    const apiClient = this.apiClient;
    const websocketCallbacks = {
      onopen: onopenAwaitedCallback,
      onmessage: (event) => {
        void handleWebSocketMessage(apiClient, callbacks.onmessage, event);
      },
      onerror: (_a = callbacks === null || callbacks === void 0 ? void 0 : callbacks.onerror) !== null && _a !== void 0 ? _a : function(e) {
      },
      onclose: (_b = callbacks === null || callbacks === void 0 ? void 0 : callbacks.onclose) !== null && _b !== void 0 ? _b : function(e) {
      }
    };
    const conn = this.webSocketFactory.create(url, headersToMap(headers), websocketCallbacks);
    conn.connect();
    await onopenPromise;
    let transformedModel = tModel(this.apiClient, params.model);
    if (this.apiClient.isVertexAI() && transformedModel.startsWith("publishers/")) {
      const project = this.apiClient.getProject();
      const location = this.apiClient.getLocation();
      transformedModel = `projects/${project}/locations/${location}/` + transformedModel;
    }
    let clientMessage = {};
    const liveConnectParameters = {
      model: transformedModel,
      config: params.config,
      callbacks: params.callbacks
    };
    if (this.apiClient.isVertexAI()) {
      clientMessage = liveConnectParametersToVertex(this.apiClient, liveConnectParameters);
    } else {
      clientMessage = liveConnectParametersToMldev(this.apiClient, liveConnectParameters);
    }
    conn.send(JSON.stringify(clientMessage));
    return new Session(conn, this.apiClient);
  }
};
var defaultLiveSendClientContentParamerters = {
  turnComplete: true
};
var Session = class {
  constructor(conn, apiClient) {
    this.conn = conn;
    this.apiClient = apiClient;
  }
  tLiveClientContent(apiClient, params) {
    if (params.turns !== null && params.turns !== void 0) {
      let contents = [];
      try {
        contents = tContents(apiClient, params.turns);
        if (apiClient.isVertexAI()) {
          contents = contents.map((item) => contentToVertex(apiClient, item));
        } else {
          contents = contents.map((item) => contentToMldev(apiClient, item));
        }
      } catch (_a) {
        throw new Error(`Failed to parse client content "turns", type: '${typeof params.turns}'`);
      }
      return {
        clientContent: { turns: contents, turnComplete: params.turnComplete }
      };
    }
    return {
      clientContent: { turnComplete: params.turnComplete }
    };
  }
  tLiveClientRealtimeInput(apiClient, params) {
    let clientMessage = {};
    if (!("media" in params) || !params.media) {
      throw new Error(`Failed to convert realtime input "media", type: '${typeof params.media}'`);
    }
    clientMessage = {
      realtimeInput: {
        mediaChunks: [params.media],
        activityStart: params.activityStart,
        activityEnd: params.activityEnd
      }
    };
    return clientMessage;
  }
  tLiveClienttToolResponse(apiClient, params) {
    let functionResponses = [];
    if (params.functionResponses == null) {
      throw new Error("functionResponses is required.");
    }
    if (!Array.isArray(params.functionResponses)) {
      functionResponses = [params.functionResponses];
    } else {
      functionResponses = params.functionResponses;
    }
    if (functionResponses.length === 0) {
      throw new Error("functionResponses is required.");
    }
    for (const functionResponse of functionResponses) {
      if (typeof functionResponse !== "object" || functionResponse === null || !("name" in functionResponse) || !("response" in functionResponse)) {
        throw new Error(`Could not parse function response, type '${typeof functionResponse}'.`);
      }
      if (!apiClient.isVertexAI() && !("id" in functionResponse)) {
        throw new Error(FUNCTION_RESPONSE_REQUIRES_ID);
      }
    }
    const clientMessage = {
      toolResponse: { functionResponses }
    };
    return clientMessage;
  }
  /**
      Send a message over the established connection.
  
      @param params - Contains two **optional** properties, `turns` and
          `turnComplete`.
  
        - `turns` will be converted to a `Content[]`
        - `turnComplete: true` [default] indicates that you are done sending
          content and expect a response. If `turnComplete: false`, the server
          will wait for additional messages before starting generation.
  
      @experimental
  
      @remarks
      There are two ways to send messages to the live API:
      `sendClientContent` and `sendRealtimeInput`.
  
      `sendClientContent` messages are added to the model context **in order**.
      Having a conversation using `sendClientContent` messages is roughly
      equivalent to using the `Chat.sendMessageStream`, except that the state of
      the `chat` history is stored on the API server instead of locally.
  
      Because of `sendClientContent`'s order guarantee, the model cannot respons
      as quickly to `sendClientContent` messages as to `sendRealtimeInput`
      messages. This makes the biggest difference when sending objects that have
      significant preprocessing time (typically images).
  
      The `sendClientContent` message sends a `Content[]`
      which has more options than the `Blob` sent by `sendRealtimeInput`.
  
      So the main use-cases for `sendClientContent` over `sendRealtimeInput` are:
  
      - Sending anything that can't be represented as a `Blob` (text,
      `sendClientContent({turns="Hello?"}`)).
      - Managing turns when not using audio input and voice activity detection.
        (`sendClientContent({turnComplete:true})` or the short form
      `sendClientContent()`)
      - Prefilling a conversation context
        ```
        sendClientContent({
            turns: [
              Content({role:user, parts:...}),
              Content({role:user, parts:...}),
              ...
            ]
        })
        ```
      @experimental
     */
  sendClientContent(params) {
    params = Object.assign(Object.assign({}, defaultLiveSendClientContentParamerters), params);
    const clientMessage = this.tLiveClientContent(this.apiClient, params);
    this.conn.send(JSON.stringify(clientMessage));
  }
  /**
      Send a realtime message over the established connection.
  
      @param params - Contains one property, `media`.
  
        - `media` will be converted to a `Blob`
  
      @experimental
  
      @remarks
      Use `sendRealtimeInput` for realtime audio chunks and video frames (images).
  
      With `sendRealtimeInput` the api will respond to audio automatically
      based on voice activity detection (VAD).
  
      `sendRealtimeInput` is optimized for responsivness at the expense of
      deterministic ordering guarantees. Audio and video tokens are to the
      context when they become available.
  
      Note: The Call signature expects a `Blob` object, but only a subset
      of audio and image mimetypes are allowed.
     */
  sendRealtimeInput(params) {
    if (params.media == null) {
      throw new Error("Media is required.");
    }
    const clientMessage = this.tLiveClientRealtimeInput(this.apiClient, params);
    this.conn.send(JSON.stringify(clientMessage));
  }
  /**
      Send a function response message over the established connection.
  
      @param params - Contains property `functionResponses`.
  
        - `functionResponses` will be converted to a `functionResponses[]`
  
      @remarks
      Use `sendFunctionResponse` to reply to `LiveServerToolCall` from the server.
  
      Use {@link types.LiveConnectConfig#tools} to configure the callable functions.
  
      @experimental
     */
  sendToolResponse(params) {
    if (params.functionResponses == null) {
      throw new Error("Tool response parameters are required.");
    }
    const clientMessage = this.tLiveClienttToolResponse(this.apiClient, params);
    this.conn.send(JSON.stringify(clientMessage));
  }
  /**
       Terminates the WebSocket connection.
  
       @experimental
  
       @example
       ```ts
       const session = await ai.live.connect({
         model: 'gemini-2.0-flash-exp',
         config: {
           responseModalities: [Modality.AUDIO],
         }
       });
  
       session.close();
       ```
     */
  close() {
    this.conn.close();
  }
};
function headersToMap(headers) {
  const headerMap = {};
  headers.forEach((value, key) => {
    headerMap[key] = value;
  });
  return headerMap;
}
function mapToHeaders(map) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(map)) {
    headers.append(key, value);
  }
  return headers;
}
var Models = class extends BaseModule {
  constructor(apiClient) {
    super();
    this.apiClient = apiClient;
    this.generateContent = async (params) => {
      return await this.generateContentInternal(params);
    };
    this.generateContentStream = async (params) => {
      return await this.generateContentStreamInternal(params);
    };
    this.generateImages = async (params) => {
      return await this.generateImagesInternal(params).then((apiResponse) => {
        var _a;
        let positivePromptSafetyAttributes;
        const generatedImages = [];
        if (apiResponse === null || apiResponse === void 0 ? void 0 : apiResponse.generatedImages) {
          for (const generatedImage of apiResponse.generatedImages) {
            if (generatedImage && (generatedImage === null || generatedImage === void 0 ? void 0 : generatedImage.safetyAttributes) && ((_a = generatedImage === null || generatedImage === void 0 ? void 0 : generatedImage.safetyAttributes) === null || _a === void 0 ? void 0 : _a.contentType) === "Positive Prompt") {
              positivePromptSafetyAttributes = generatedImage === null || generatedImage === void 0 ? void 0 : generatedImage.safetyAttributes;
            } else {
              generatedImages.push(generatedImage);
            }
          }
        }
        let response;
        if (positivePromptSafetyAttributes) {
          response = {
            generatedImages,
            positivePromptSafetyAttributes
          };
        } else {
          response = {
            generatedImages
          };
        }
        return response;
      });
    };
  }
  async generateContentInternal(params) {
    var _a, _b;
    let response;
    let path = "";
    let queryParams = {};
    if (this.apiClient.isVertexAI()) {
      const body = generateContentParametersToVertex(this.apiClient, params);
      path = formatMap("{model}:generateContent", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "POST",
        httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = generateContentResponseFromVertex(this.apiClient, apiResponse);
        const typedResp = new GenerateContentResponse();
        Object.assign(typedResp, resp);
        return typedResp;
      });
    } else {
      const body = generateContentParametersToMldev(this.apiClient, params);
      path = formatMap("{model}:generateContent", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "POST",
        httpOptions: (_b = params.config) === null || _b === void 0 ? void 0 : _b.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = generateContentResponseFromMldev(this.apiClient, apiResponse);
        const typedResp = new GenerateContentResponse();
        Object.assign(typedResp, resp);
        return typedResp;
      });
    }
  }
  async generateContentStreamInternal(params) {
    var _a, _b;
    let response;
    let path = "";
    let queryParams = {};
    if (this.apiClient.isVertexAI()) {
      const body = generateContentParametersToVertex(this.apiClient, params);
      path = formatMap("{model}:streamGenerateContent?alt=sse", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      const apiClient = this.apiClient;
      response = apiClient.requestStream({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "POST",
        httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions
      });
      return response.then(function(apiResponse) {
        return __asyncGenerator(this, arguments, function* () {
          var _a2, e_1, _b2, _c;
          try {
            for (var _d = true, apiResponse_1 = __asyncValues(apiResponse), apiResponse_1_1; apiResponse_1_1 = yield __await(apiResponse_1.next()), _a2 = apiResponse_1_1.done, !_a2; _d = true) {
              _c = apiResponse_1_1.value;
              _d = false;
              const chunk = _c;
              const resp = generateContentResponseFromVertex(apiClient, chunk);
              const typedResp = new GenerateContentResponse();
              Object.assign(typedResp, resp);
              yield yield __await(typedResp);
            }
          } catch (e_1_1) {
            e_1 = { error: e_1_1 };
          } finally {
            try {
              if (!_d && !_a2 && (_b2 = apiResponse_1.return)) yield __await(_b2.call(apiResponse_1));
            } finally {
              if (e_1) throw e_1.error;
            }
          }
        });
      });
    } else {
      const body = generateContentParametersToMldev(this.apiClient, params);
      path = formatMap("{model}:streamGenerateContent?alt=sse", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      const apiClient = this.apiClient;
      response = apiClient.requestStream({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "POST",
        httpOptions: (_b = params.config) === null || _b === void 0 ? void 0 : _b.httpOptions
      });
      return response.then(function(apiResponse) {
        return __asyncGenerator(this, arguments, function* () {
          var _a2, e_2, _b2, _c;
          try {
            for (var _d = true, apiResponse_2 = __asyncValues(apiResponse), apiResponse_2_1; apiResponse_2_1 = yield __await(apiResponse_2.next()), _a2 = apiResponse_2_1.done, !_a2; _d = true) {
              _c = apiResponse_2_1.value;
              _d = false;
              const chunk = _c;
              const resp = generateContentResponseFromMldev(apiClient, chunk);
              const typedResp = new GenerateContentResponse();
              Object.assign(typedResp, resp);
              yield yield __await(typedResp);
            }
          } catch (e_2_1) {
            e_2 = { error: e_2_1 };
          } finally {
            try {
              if (!_d && !_a2 && (_b2 = apiResponse_2.return)) yield __await(_b2.call(apiResponse_2));
            } finally {
              if (e_2) throw e_2.error;
            }
          }
        });
      });
    }
  }
  /**
   * Calculates embeddings for the given contents. Only text is supported.
   *
   * @param params - The parameters for embedding contents.
   * @return The response from the API.
   *
   * @example
   * ```ts
   * const response = await ai.models.embedContent({
   *  model: 'text-embedding-004',
   *  contents: [
   *    'What is your name?',
   *    'What is your favorite color?',
   *  ],
   *  config: {
   *    outputDimensionality: 64,
   *  },
   * });
   * console.log(response);
   * ```
   */
  async embedContent(params) {
    var _a, _b;
    let response;
    let path = "";
    let queryParams = {};
    if (this.apiClient.isVertexAI()) {
      const body = embedContentParametersToVertex(this.apiClient, params);
      path = formatMap("{model}:predict", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "POST",
        httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = embedContentResponseFromVertex(this.apiClient, apiResponse);
        const typedResp = new EmbedContentResponse();
        Object.assign(typedResp, resp);
        return typedResp;
      });
    } else {
      const body = embedContentParametersToMldev(this.apiClient, params);
      path = formatMap("{model}:batchEmbedContents", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "POST",
        httpOptions: (_b = params.config) === null || _b === void 0 ? void 0 : _b.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = embedContentResponseFromMldev(this.apiClient, apiResponse);
        const typedResp = new EmbedContentResponse();
        Object.assign(typedResp, resp);
        return typedResp;
      });
    }
  }
  /**
   * Generates an image based on a text description and configuration.
   *
   * @param params - The parameters for generating images.
   * @return The response from the API.
   *
   * @example
   * ```ts
   * const response = await ai.models.generateImages({
   *  model: 'imagen-3.0-generate-002',
   *  prompt: 'Robot holding a red skateboard',
   *  config: {
   *    numberOfImages: 1,
   *    includeRaiReason: true,
   *  },
   * });
   * console.log(response?.generatedImages?.[0]?.image?.imageBytes);
   * ```
   */
  async generateImagesInternal(params) {
    var _a, _b;
    let response;
    let path = "";
    let queryParams = {};
    if (this.apiClient.isVertexAI()) {
      const body = generateImagesParametersToVertex(this.apiClient, params);
      path = formatMap("{model}:predict", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "POST",
        httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = generateImagesResponseFromVertex(this.apiClient, apiResponse);
        const typedResp = new GenerateImagesResponse();
        Object.assign(typedResp, resp);
        return typedResp;
      });
    } else {
      const body = generateImagesParametersToMldev(this.apiClient, params);
      path = formatMap("{model}:predict", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "POST",
        httpOptions: (_b = params.config) === null || _b === void 0 ? void 0 : _b.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = generateImagesResponseFromMldev(this.apiClient, apiResponse);
        const typedResp = new GenerateImagesResponse();
        Object.assign(typedResp, resp);
        return typedResp;
      });
    }
  }
  /**
   * Fetches information about a model by name.
   *
   * @example
   * ```ts
   * const modelInfo = await ai.models.get({model: 'gemini-2.0-flash'});
   * ```
   */
  async get(params) {
    var _a, _b;
    let response;
    let path = "";
    let queryParams = {};
    if (this.apiClient.isVertexAI()) {
      const body = getModelParametersToVertex(this.apiClient, params);
      path = formatMap("{name}", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "GET",
        httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = modelFromVertex(this.apiClient, apiResponse);
        return resp;
      });
    } else {
      const body = getModelParametersToMldev(this.apiClient, params);
      path = formatMap("{name}", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "GET",
        httpOptions: (_b = params.config) === null || _b === void 0 ? void 0 : _b.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = modelFromMldev(this.apiClient, apiResponse);
        return resp;
      });
    }
  }
  /**
   * Counts the number of tokens in the given contents. Multimodal input is
   * supported for Gemini models.
   *
   * @param params - The parameters for counting tokens.
   * @return The response from the API.
   *
   * @example
   * ```ts
   * const response = await ai.models.countTokens({
   *  model: 'gemini-2.0-flash',
   *  contents: 'The quick brown fox jumps over the lazy dog.'
   * });
   * console.log(response);
   * ```
   */
  async countTokens(params) {
    var _a, _b;
    let response;
    let path = "";
    let queryParams = {};
    if (this.apiClient.isVertexAI()) {
      const body = countTokensParametersToVertex(this.apiClient, params);
      path = formatMap("{model}:countTokens", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "POST",
        httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = countTokensResponseFromVertex(this.apiClient, apiResponse);
        const typedResp = new CountTokensResponse();
        Object.assign(typedResp, resp);
        return typedResp;
      });
    } else {
      const body = countTokensParametersToMldev(this.apiClient, params);
      path = formatMap("{model}:countTokens", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "POST",
        httpOptions: (_b = params.config) === null || _b === void 0 ? void 0 : _b.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = countTokensResponseFromMldev(this.apiClient, apiResponse);
        const typedResp = new CountTokensResponse();
        Object.assign(typedResp, resp);
        return typedResp;
      });
    }
  }
  /**
   * Given a list of contents, returns a corresponding TokensInfo containing
   * the list of tokens and list of token ids.
   *
   * This method is not supported by the Gemini Developer API.
   *
   * @param params - The parameters for computing tokens.
   * @return The response from the API.
   *
   * @example
   * ```ts
   * const response = await ai.models.computeTokens({
   *  model: 'gemini-2.0-flash',
   *  contents: 'What is your name?'
   * });
   * console.log(response);
   * ```
   */
  async computeTokens(params) {
    var _a;
    let response;
    let path = "";
    let queryParams = {};
    if (this.apiClient.isVertexAI()) {
      const body = computeTokensParametersToVertex(this.apiClient, params);
      path = formatMap("{model}:computeTokens", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "POST",
        httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = computeTokensResponseFromVertex(this.apiClient, apiResponse);
        const typedResp = new ComputeTokensResponse();
        Object.assign(typedResp, resp);
        return typedResp;
      });
    } else {
      throw new Error("This method is only supported by the Vertex AI.");
    }
  }
  /**
   *  Generates videos based on a text description and configuration.
   *
   * @param params - The parameters for generating videos.
   * @return A Promise<GenerateVideosOperation> which allows you to track the progress and eventually retrieve the generated videos using the operations.get method.
   *
   * @example
   * ```ts
   * const operation = await ai.models.generateVideos({
   *  model: 'veo-2.0-generate-001',
   *  prompt: 'A neon hologram of a cat driving at top speed',
   *  config: {
   *    numberOfVideos: 1
   * });
   *
   * while (!operation.done) {
   *   await new Promise(resolve => setTimeout(resolve, 10000));
   *   operation = await ai.operations.getVideosOperation({operation: operation});
   * }
   *
   * console.log(operation.response?.generatedVideos?.[0]?.video?.uri);
   * ```
   */
  async generateVideos(params) {
    var _a, _b;
    let response;
    let path = "";
    let queryParams = {};
    if (this.apiClient.isVertexAI()) {
      const body = generateVideosParametersToVertex(this.apiClient, params);
      path = formatMap("{model}:predictLongRunning", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "POST",
        httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = generateVideosOperationFromVertex$1(this.apiClient, apiResponse);
        return resp;
      });
    } else {
      const body = generateVideosParametersToMldev(this.apiClient, params);
      path = formatMap("{model}:predictLongRunning", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "POST",
        httpOptions: (_b = params.config) === null || _b === void 0 ? void 0 : _b.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = generateVideosOperationFromMldev$1(this.apiClient, apiResponse);
        return resp;
      });
    }
  }
};
function getOperationParametersToMldev(apiClient, fromObject) {
  const toObject = {};
  const fromOperationName = getValueByPath(fromObject, [
    "operationName"
  ]);
  if (fromOperationName != null) {
    setValueByPath(toObject, ["_url", "operationName"], fromOperationName);
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], fromConfig);
  }
  return toObject;
}
function getOperationParametersToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromOperationName = getValueByPath(fromObject, [
    "operationName"
  ]);
  if (fromOperationName != null) {
    setValueByPath(toObject, ["_url", "operationName"], fromOperationName);
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], fromConfig);
  }
  return toObject;
}
function fetchPredictOperationParametersToVertex(apiClient, fromObject) {
  const toObject = {};
  const fromOperationName = getValueByPath(fromObject, [
    "operationName"
  ]);
  if (fromOperationName != null) {
    setValueByPath(toObject, ["operationName"], fromOperationName);
  }
  const fromResourceName = getValueByPath(fromObject, ["resourceName"]);
  if (fromResourceName != null) {
    setValueByPath(toObject, ["_url", "resourceName"], fromResourceName);
  }
  const fromConfig = getValueByPath(fromObject, ["config"]);
  if (fromConfig != null) {
    setValueByPath(toObject, ["config"], fromConfig);
  }
  return toObject;
}
function videoFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromUri = getValueByPath(fromObject, ["video", "uri"]);
  if (fromUri != null) {
    setValueByPath(toObject, ["uri"], fromUri);
  }
  const fromVideoBytes = getValueByPath(fromObject, [
    "video",
    "encodedVideo"
  ]);
  if (fromVideoBytes != null) {
    setValueByPath(toObject, ["videoBytes"], tBytes(apiClient, fromVideoBytes));
  }
  const fromMimeType = getValueByPath(fromObject, ["encoding"]);
  if (fromMimeType != null) {
    setValueByPath(toObject, ["mimeType"], fromMimeType);
  }
  return toObject;
}
function generatedVideoFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromVideo = getValueByPath(fromObject, ["_self"]);
  if (fromVideo != null) {
    setValueByPath(toObject, ["video"], videoFromMldev(apiClient, fromVideo));
  }
  return toObject;
}
function generateVideosResponseFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromGeneratedVideos = getValueByPath(fromObject, [
    "generatedSamples"
  ]);
  if (fromGeneratedVideos != null) {
    if (Array.isArray(fromGeneratedVideos)) {
      setValueByPath(toObject, ["generatedVideos"], fromGeneratedVideos.map((item) => {
        return generatedVideoFromMldev(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["generatedVideos"], fromGeneratedVideos);
    }
  }
  const fromRaiMediaFilteredCount = getValueByPath(fromObject, [
    "raiMediaFilteredCount"
  ]);
  if (fromRaiMediaFilteredCount != null) {
    setValueByPath(toObject, ["raiMediaFilteredCount"], fromRaiMediaFilteredCount);
  }
  const fromRaiMediaFilteredReasons = getValueByPath(fromObject, [
    "raiMediaFilteredReasons"
  ]);
  if (fromRaiMediaFilteredReasons != null) {
    setValueByPath(toObject, ["raiMediaFilteredReasons"], fromRaiMediaFilteredReasons);
  }
  return toObject;
}
function generateVideosOperationFromMldev(apiClient, fromObject) {
  const toObject = {};
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName != null) {
    setValueByPath(toObject, ["name"], fromName);
  }
  const fromMetadata = getValueByPath(fromObject, ["metadata"]);
  if (fromMetadata != null) {
    setValueByPath(toObject, ["metadata"], fromMetadata);
  }
  const fromDone = getValueByPath(fromObject, ["done"]);
  if (fromDone != null) {
    setValueByPath(toObject, ["done"], fromDone);
  }
  const fromError = getValueByPath(fromObject, ["error"]);
  if (fromError != null) {
    setValueByPath(toObject, ["error"], fromError);
  }
  const fromResponse = getValueByPath(fromObject, [
    "response",
    "generateVideoResponse"
  ]);
  if (fromResponse != null) {
    setValueByPath(toObject, ["response"], generateVideosResponseFromMldev(apiClient, fromResponse));
  }
  const fromResult = getValueByPath(fromObject, [
    "response",
    "generateVideoResponse"
  ]);
  if (fromResult != null) {
    setValueByPath(toObject, ["result"], generateVideosResponseFromMldev(apiClient, fromResult));
  }
  return toObject;
}
function videoFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromUri = getValueByPath(fromObject, ["gcsUri"]);
  if (fromUri != null) {
    setValueByPath(toObject, ["uri"], fromUri);
  }
  const fromVideoBytes = getValueByPath(fromObject, [
    "bytesBase64Encoded"
  ]);
  if (fromVideoBytes != null) {
    setValueByPath(toObject, ["videoBytes"], tBytes(apiClient, fromVideoBytes));
  }
  const fromMimeType = getValueByPath(fromObject, ["mimeType"]);
  if (fromMimeType != null) {
    setValueByPath(toObject, ["mimeType"], fromMimeType);
  }
  return toObject;
}
function generatedVideoFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromVideo = getValueByPath(fromObject, ["_self"]);
  if (fromVideo != null) {
    setValueByPath(toObject, ["video"], videoFromVertex(apiClient, fromVideo));
  }
  return toObject;
}
function generateVideosResponseFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromGeneratedVideos = getValueByPath(fromObject, ["videos"]);
  if (fromGeneratedVideos != null) {
    if (Array.isArray(fromGeneratedVideos)) {
      setValueByPath(toObject, ["generatedVideos"], fromGeneratedVideos.map((item) => {
        return generatedVideoFromVertex(apiClient, item);
      }));
    } else {
      setValueByPath(toObject, ["generatedVideos"], fromGeneratedVideos);
    }
  }
  const fromRaiMediaFilteredCount = getValueByPath(fromObject, [
    "raiMediaFilteredCount"
  ]);
  if (fromRaiMediaFilteredCount != null) {
    setValueByPath(toObject, ["raiMediaFilteredCount"], fromRaiMediaFilteredCount);
  }
  const fromRaiMediaFilteredReasons = getValueByPath(fromObject, [
    "raiMediaFilteredReasons"
  ]);
  if (fromRaiMediaFilteredReasons != null) {
    setValueByPath(toObject, ["raiMediaFilteredReasons"], fromRaiMediaFilteredReasons);
  }
  return toObject;
}
function generateVideosOperationFromVertex(apiClient, fromObject) {
  const toObject = {};
  const fromName = getValueByPath(fromObject, ["name"]);
  if (fromName != null) {
    setValueByPath(toObject, ["name"], fromName);
  }
  const fromMetadata = getValueByPath(fromObject, ["metadata"]);
  if (fromMetadata != null) {
    setValueByPath(toObject, ["metadata"], fromMetadata);
  }
  const fromDone = getValueByPath(fromObject, ["done"]);
  if (fromDone != null) {
    setValueByPath(toObject, ["done"], fromDone);
  }
  const fromError = getValueByPath(fromObject, ["error"]);
  if (fromError != null) {
    setValueByPath(toObject, ["error"], fromError);
  }
  const fromResponse = getValueByPath(fromObject, ["response"]);
  if (fromResponse != null) {
    setValueByPath(toObject, ["response"], generateVideosResponseFromVertex(apiClient, fromResponse));
  }
  const fromResult = getValueByPath(fromObject, ["response"]);
  if (fromResult != null) {
    setValueByPath(toObject, ["result"], generateVideosResponseFromVertex(apiClient, fromResult));
  }
  return toObject;
}
var Operations = class extends BaseModule {
  constructor(apiClient) {
    super();
    this.apiClient = apiClient;
  }
  /**
   * Gets the status of a long-running operation.
   *
   * @param parameters The parameters for the get operation request.
   * @return The updated Operation object, with the latest status or result.
   */
  async getVideosOperation(parameters) {
    const operation = parameters.operation;
    const config = parameters.config;
    if (operation.name === void 0 || operation.name === "") {
      throw new Error("Operation name is required.");
    }
    if (this.apiClient.isVertexAI()) {
      const resourceName2 = operation.name.split("/operations/")[0];
      var httpOptions = void 0;
      if (config && "httpOptions" in config) {
        httpOptions = config.httpOptions;
      }
      return this.fetchPredictVideosOperationInternal({
        operationName: operation.name,
        resourceName: resourceName2,
        config: { httpOptions }
      });
    } else {
      return this.getVideosOperationInternal({
        operationName: operation.name,
        config
      });
    }
  }
  async getVideosOperationInternal(params) {
    var _a, _b;
    let response;
    let path = "";
    let queryParams = {};
    if (this.apiClient.isVertexAI()) {
      const body = getOperationParametersToVertex(this.apiClient, params);
      path = formatMap("{operationName}", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "GET",
        httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = generateVideosOperationFromVertex(this.apiClient, apiResponse);
        return resp;
      });
    } else {
      const body = getOperationParametersToMldev(this.apiClient, params);
      path = formatMap("{operationName}", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "GET",
        httpOptions: (_b = params.config) === null || _b === void 0 ? void 0 : _b.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = generateVideosOperationFromMldev(this.apiClient, apiResponse);
        return resp;
      });
    }
  }
  async fetchPredictVideosOperationInternal(params) {
    var _a;
    let response;
    let path = "";
    let queryParams = {};
    if (this.apiClient.isVertexAI()) {
      const body = fetchPredictOperationParametersToVertex(this.apiClient, params);
      path = formatMap("{resourceName}:fetchPredictOperation", body["_url"]);
      queryParams = body["_query"];
      delete body["config"];
      delete body["_url"];
      delete body["_query"];
      response = this.apiClient.request({
        path,
        queryParams,
        body: JSON.stringify(body),
        httpMethod: "POST",
        httpOptions: (_a = params.config) === null || _a === void 0 ? void 0 : _a.httpOptions
      }).then((httpResponse) => {
        return httpResponse.json();
      });
      return response.then((apiResponse) => {
        const resp = generateVideosOperationFromVertex(this.apiClient, apiResponse);
        return resp;
      });
    } else {
      throw new Error("This method is only supported by the Vertex AI.");
    }
  }
};
var CONTENT_TYPE_HEADER = "Content-Type";
var SERVER_TIMEOUT_HEADER = "X-Server-Timeout";
var USER_AGENT_HEADER = "User-Agent";
var GOOGLE_API_CLIENT_HEADER = "x-goog-api-client";
var SDK_VERSION = "0.8.0";
var LIBRARY_LABEL = `google-genai-sdk/${SDK_VERSION}`;
var VERTEX_AI_API_DEFAULT_VERSION = "v1beta1";
var GOOGLE_AI_API_DEFAULT_VERSION = "v1beta";
var responseLineRE = /^data: (.*)(?:\n\n|\r\r|\r\n\r\n)/;
var ClientError = class extends Error {
  constructor(message, stackTrace) {
    if (stackTrace) {
      super(message, { cause: stackTrace });
    } else {
      super(message, { cause: new Error().stack });
    }
    this.message = message;
    this.name = "ClientError";
  }
};
var ServerError = class extends Error {
  constructor(message, stackTrace) {
    if (stackTrace) {
      super(message, { cause: stackTrace });
    } else {
      super(message, { cause: new Error().stack });
    }
    this.message = message;
    this.name = "ServerError";
  }
};
var ApiClient = class {
  constructor(opts) {
    var _a, _b;
    this.clientOptions = Object.assign(Object.assign({}, opts), { project: opts.project, location: opts.location, apiKey: opts.apiKey, vertexai: opts.vertexai });
    const initHttpOptions = {};
    if (this.clientOptions.vertexai) {
      initHttpOptions.apiVersion = (_a = this.clientOptions.apiVersion) !== null && _a !== void 0 ? _a : VERTEX_AI_API_DEFAULT_VERSION;
      if (this.getProject() || this.getLocation()) {
        initHttpOptions.baseUrl = `https://${this.clientOptions.location}-aiplatform.googleapis.com/`;
        this.clientOptions.apiKey = void 0;
      } else {
        initHttpOptions.baseUrl = `https://aiplatform.googleapis.com/`;
        this.clientOptions.project = void 0;
        this.clientOptions.location = void 0;
      }
    } else {
      initHttpOptions.apiVersion = (_b = this.clientOptions.apiVersion) !== null && _b !== void 0 ? _b : GOOGLE_AI_API_DEFAULT_VERSION;
      initHttpOptions.baseUrl = `https://generativelanguage.googleapis.com/`;
    }
    initHttpOptions.headers = this.getDefaultHeaders();
    this.clientOptions.httpOptions = initHttpOptions;
    if (opts.httpOptions) {
      this.clientOptions.httpOptions = this.patchHttpOptions(initHttpOptions, opts.httpOptions);
    }
  }
  isVertexAI() {
    var _a;
    return (_a = this.clientOptions.vertexai) !== null && _a !== void 0 ? _a : false;
  }
  getProject() {
    return this.clientOptions.project;
  }
  getLocation() {
    return this.clientOptions.location;
  }
  getApiVersion() {
    if (this.clientOptions.httpOptions && this.clientOptions.httpOptions.apiVersion !== void 0) {
      return this.clientOptions.httpOptions.apiVersion;
    }
    throw new Error("API version is not set.");
  }
  getBaseUrl() {
    if (this.clientOptions.httpOptions && this.clientOptions.httpOptions.baseUrl !== void 0) {
      return this.clientOptions.httpOptions.baseUrl;
    }
    throw new Error("Base URL is not set.");
  }
  getRequestUrl() {
    return this.getRequestUrlInternal(this.clientOptions.httpOptions);
  }
  getHeaders() {
    if (this.clientOptions.httpOptions && this.clientOptions.httpOptions.headers !== void 0) {
      return this.clientOptions.httpOptions.headers;
    } else {
      throw new Error("Headers are not set.");
    }
  }
  getRequestUrlInternal(httpOptions) {
    if (!httpOptions || httpOptions.baseUrl === void 0 || httpOptions.apiVersion === void 0) {
      throw new Error("HTTP options are not correctly set.");
    }
    const baseUrl = httpOptions.baseUrl.endsWith("/") ? httpOptions.baseUrl.slice(0, -1) : httpOptions.baseUrl;
    const urlElement = [baseUrl];
    if (httpOptions.apiVersion && httpOptions.apiVersion !== "") {
      urlElement.push(httpOptions.apiVersion);
    }
    return urlElement.join("/");
  }
  getBaseResourcePath() {
    return `projects/${this.clientOptions.project}/locations/${this.clientOptions.location}`;
  }
  getApiKey() {
    return this.clientOptions.apiKey;
  }
  getWebsocketBaseUrl() {
    const baseUrl = this.getBaseUrl();
    const urlParts = new URL(baseUrl);
    urlParts.protocol = "wss";
    return urlParts.toString();
  }
  setBaseUrl(url) {
    if (this.clientOptions.httpOptions) {
      this.clientOptions.httpOptions.baseUrl = url;
    } else {
      throw new Error("HTTP options are not correctly set.");
    }
  }
  constructUrl(path, httpOptions, prependProjectLocation) {
    const urlElement = [this.getRequestUrlInternal(httpOptions)];
    if (prependProjectLocation) {
      urlElement.push(this.getBaseResourcePath());
    }
    if (path !== "") {
      urlElement.push(path);
    }
    const url = new URL(`${urlElement.join("/")}`);
    return url;
  }
  shouldPrependVertexProjectPath(request) {
    if (this.clientOptions.apiKey) {
      return false;
    }
    if (!this.clientOptions.vertexai) {
      return false;
    }
    if (request.path.startsWith("projects/")) {
      return false;
    }
    if (request.httpMethod === "GET" && request.path.startsWith("publishers/google/models")) {
      return false;
    }
    return true;
  }
  async request(request) {
    let patchedHttpOptions = this.clientOptions.httpOptions;
    if (request.httpOptions) {
      patchedHttpOptions = this.patchHttpOptions(this.clientOptions.httpOptions, request.httpOptions);
    }
    const prependProjectLocation = this.shouldPrependVertexProjectPath(request);
    const url = this.constructUrl(request.path, patchedHttpOptions, prependProjectLocation);
    if (request.queryParams) {
      for (const [key, value] of Object.entries(request.queryParams)) {
        url.searchParams.append(key, String(value));
      }
    }
    let requestInit = {};
    if (request.httpMethod === "GET") {
      if (request.body && request.body !== "{}") {
        throw new Error("Request body should be empty for GET request, but got non empty request body");
      }
    } else {
      requestInit.body = request.body;
    }
    requestInit = await this.includeExtraHttpOptionsToRequestInit(requestInit, patchedHttpOptions);
    return this.unaryApiCall(url, requestInit, request.httpMethod);
  }
  patchHttpOptions(baseHttpOptions, requestHttpOptions) {
    const patchedHttpOptions = JSON.parse(JSON.stringify(baseHttpOptions));
    for (const [key, value] of Object.entries(requestHttpOptions)) {
      if (typeof value === "object") {
        patchedHttpOptions[key] = Object.assign(Object.assign({}, patchedHttpOptions[key]), value);
      } else if (value !== void 0) {
        patchedHttpOptions[key] = value;
      }
    }
    return patchedHttpOptions;
  }
  async requestStream(request) {
    let patchedHttpOptions = this.clientOptions.httpOptions;
    if (request.httpOptions) {
      patchedHttpOptions = this.patchHttpOptions(this.clientOptions.httpOptions, request.httpOptions);
    }
    const prependProjectLocation = this.shouldPrependVertexProjectPath(request);
    const url = this.constructUrl(request.path, patchedHttpOptions, prependProjectLocation);
    if (!url.searchParams.has("alt") || url.searchParams.get("alt") !== "sse") {
      url.searchParams.set("alt", "sse");
    }
    let requestInit = {};
    requestInit.body = request.body;
    requestInit = await this.includeExtraHttpOptionsToRequestInit(requestInit, patchedHttpOptions);
    return this.streamApiCall(url, requestInit, request.httpMethod);
  }
  async includeExtraHttpOptionsToRequestInit(requestInit, httpOptions) {
    if (httpOptions && httpOptions.timeout && httpOptions.timeout > 0) {
      const abortController = new AbortController();
      const signal = abortController.signal;
      setTimeout(() => abortController.abort(), httpOptions.timeout);
      requestInit.signal = signal;
    }
    requestInit.headers = await this.getHeadersInternal(httpOptions);
    return requestInit;
  }
  async unaryApiCall(url, requestInit, httpMethod) {
    return this.apiCall(url.toString(), Object.assign(Object.assign({}, requestInit), { method: httpMethod })).then(async (response) => {
      await throwErrorIfNotOK(response);
      return new HttpResponse(response);
    }).catch((e) => {
      if (e instanceof Error) {
        throw e;
      } else {
        throw new Error(JSON.stringify(e));
      }
    });
  }
  async streamApiCall(url, requestInit, httpMethod) {
    return this.apiCall(url.toString(), Object.assign(Object.assign({}, requestInit), { method: httpMethod })).then(async (response) => {
      await throwErrorIfNotOK(response);
      return this.processStreamResponse(response);
    }).catch((e) => {
      if (e instanceof Error) {
        throw e;
      } else {
        throw new Error(JSON.stringify(e));
      }
    });
  }
  processStreamResponse(response) {
    var _a;
    return __asyncGenerator(this, arguments, function* processStreamResponse_1() {
      const reader = (_a = response === null || response === void 0 ? void 0 : response.body) === null || _a === void 0 ? void 0 : _a.getReader();
      const decoder = new TextDecoder("utf-8");
      if (!reader) {
        throw new Error("Response body is empty");
      }
      try {
        let buffer = "";
        while (true) {
          const { done, value } = yield __await(reader.read());
          if (done) {
            if (buffer.trim().length > 0) {
              throw new Error("Incomplete JSON segment at the end");
            }
            break;
          }
          const chunkString = decoder.decode(value);
          buffer += chunkString;
          let match = buffer.match(responseLineRE);
          while (match) {
            const processedChunkString = match[1];
            try {
              const chunkData = JSON.parse(processedChunkString);
              yield yield __await(chunkData);
              buffer = buffer.slice(match[0].length);
              match = buffer.match(responseLineRE);
            } catch (e) {
              throw new Error(`exception parsing stream chunk ${processedChunkString}. ${e}`);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    });
  }
  async apiCall(url, requestInit) {
    return fetch(url, requestInit).catch((e) => {
      throw new Error(`exception ${e} sending request`);
    });
  }
  getDefaultHeaders() {
    const headers = {};
    const versionHeaderValue = LIBRARY_LABEL + " " + this.clientOptions.userAgentExtra;
    headers[USER_AGENT_HEADER] = versionHeaderValue;
    headers[GOOGLE_API_CLIENT_HEADER] = versionHeaderValue;
    headers[CONTENT_TYPE_HEADER] = "application/json";
    return headers;
  }
  async getHeadersInternal(httpOptions) {
    const headers = new Headers();
    if (httpOptions && httpOptions.headers) {
      for (const [key, value] of Object.entries(httpOptions.headers)) {
        headers.append(key, value);
      }
      if (httpOptions.timeout && httpOptions.timeout > 0) {
        headers.append(SERVER_TIMEOUT_HEADER, String(Math.ceil(httpOptions.timeout / 1e3)));
      }
    }
    await this.clientOptions.auth.addAuthHeaders(headers);
    return headers;
  }
  /**
   * Uploads a file asynchronously using Gemini API only, this is not supported
   * in Vertex AI.
   *
   * @param file The string path to the file to be uploaded or a Blob object.
   * @param config Optional parameters specified in the `UploadFileConfig`
   *     interface. @see {@link UploadFileConfig}
   * @return A promise that resolves to a `File` object.
   * @throws An error if called on a Vertex AI client.
   * @throws An error if the `mimeType` is not provided and can not be inferred,
   */
  async uploadFile(file, config) {
    var _a;
    const fileToUpload = {};
    if (config != null) {
      fileToUpload.mimeType = config.mimeType;
      fileToUpload.name = config.name;
      fileToUpload.displayName = config.displayName;
    }
    if (fileToUpload.name && !fileToUpload.name.startsWith("files/")) {
      fileToUpload.name = `files/${fileToUpload.name}`;
    }
    const uploader = this.clientOptions.uploader;
    const fileStat = await uploader.stat(file);
    fileToUpload.sizeBytes = String(fileStat.size);
    const mimeType = (_a = config === null || config === void 0 ? void 0 : config.mimeType) !== null && _a !== void 0 ? _a : fileStat.type;
    if (mimeType === void 0 || mimeType === "") {
      throw new Error("Can not determine mimeType. Please provide mimeType in the config.");
    }
    fileToUpload.mimeType = mimeType;
    const uploadUrl = await this.fetchUploadUrl(fileToUpload, config);
    return uploader.upload(file, uploadUrl, this);
  }
  async fetchUploadUrl(file, config) {
    var _a;
    let httpOptions = {};
    if (config === null || config === void 0 ? void 0 : config.httpOptions) {
      httpOptions = config.httpOptions;
    } else {
      httpOptions = {
        apiVersion: "",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Upload-Protocol": "resumable",
          "X-Goog-Upload-Command": "start",
          "X-Goog-Upload-Header-Content-Length": `${file.sizeBytes}`,
          "X-Goog-Upload-Header-Content-Type": `${file.mimeType}`
        }
      };
    }
    const body = {
      "file": file
    };
    const httpResponse = await this.request({
      path: formatMap("upload/v1beta/files", body["_url"]),
      body: JSON.stringify(body),
      httpMethod: "POST",
      httpOptions
    });
    if (!httpResponse || !(httpResponse === null || httpResponse === void 0 ? void 0 : httpResponse.headers)) {
      throw new Error("Server did not return an HttpResponse or the returned HttpResponse did not have headers.");
    }
    const uploadUrl = (_a = httpResponse === null || httpResponse === void 0 ? void 0 : httpResponse.headers) === null || _a === void 0 ? void 0 : _a["x-goog-upload-url"];
    if (uploadUrl === void 0) {
      throw new Error("Failed to get upload url. Server did not return the x-google-upload-url in the headers");
    }
    return uploadUrl;
  }
};
async function throwErrorIfNotOK(response) {
  var _a;
  if (response === void 0) {
    throw new ServerError("response is undefined");
  }
  if (!response.ok) {
    const status = response.status;
    const statusText = response.statusText;
    let errorBody;
    if ((_a = response.headers.get("content-type")) === null || _a === void 0 ? void 0 : _a.includes("application/json")) {
      errorBody = await response.json();
    } else {
      errorBody = {
        error: {
          message: "exception parsing response",
          code: response.status,
          status: response.statusText
        }
      };
    }
    const errorMessage = `got status: ${status} ${statusText}. ${JSON.stringify(errorBody)}`;
    if (status >= 400 && status < 500) {
      const clientError = new ClientError(errorMessage);
      throw clientError;
    } else if (status >= 500 && status < 600) {
      const serverError = new ServerError(errorMessage);
      throw serverError;
    }
    throw new Error(errorMessage);
  }
}
var MAX_CHUNK_SIZE = 1024 * 1024 * 8;
async function uploadBlob(file, uploadUrl, apiClient) {
  var _a, _b;
  let fileSize = 0;
  let offset = 0;
  let response = new HttpResponse(new Response());
  let uploadCommand = "upload";
  fileSize = file.size;
  while (offset < fileSize) {
    const chunkSize = Math.min(MAX_CHUNK_SIZE, fileSize - offset);
    const chunk = file.slice(offset, offset + chunkSize);
    if (offset + chunkSize >= fileSize) {
      uploadCommand += ", finalize";
    }
    response = await apiClient.request({
      path: "",
      body: chunk,
      httpMethod: "POST",
      httpOptions: {
        apiVersion: "",
        baseUrl: uploadUrl,
        headers: {
          "X-Goog-Upload-Command": uploadCommand,
          "X-Goog-Upload-Offset": String(offset),
          "Content-Length": String(chunkSize)
        }
      }
    });
    offset += chunkSize;
    if (((_a = response === null || response === void 0 ? void 0 : response.headers) === null || _a === void 0 ? void 0 : _a["x-goog-upload-status"]) !== "active") {
      break;
    }
    if (fileSize <= offset) {
      throw new Error("All content has been uploaded, but the upload status is not finalized.");
    }
  }
  const responseJson = await (response === null || response === void 0 ? void 0 : response.json());
  if (((_b = response === null || response === void 0 ? void 0 : response.headers) === null || _b === void 0 ? void 0 : _b["x-goog-upload-status"]) !== "final") {
    throw new Error("Failed to upload file: Upload status is not finalized.");
  }
  return responseJson["file"];
}
async function getBlobStat(file) {
  const fileStat = { size: file.size, type: file.type };
  return fileStat;
}
var BrowserUploader = class {
  async upload(file, uploadUrl, apiClient) {
    if (typeof file === "string") {
      throw new Error("File path is not supported in browser uploader.");
    }
    return await uploadBlob(file, uploadUrl, apiClient);
  }
  async stat(file) {
    if (typeof file === "string") {
      throw new Error("File path is not supported in browser uploader.");
    } else {
      return await getBlobStat(file);
    }
  }
};
var BrowserWebSocketFactory = class {
  create(url, headers, callbacks) {
    return new BrowserWebSocket(url, headers, callbacks);
  }
};
var BrowserWebSocket = class {
  constructor(url, headers, callbacks) {
    this.url = url;
    this.headers = headers;
    this.callbacks = callbacks;
  }
  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = this.callbacks.onopen;
    this.ws.onerror = this.callbacks.onerror;
    this.ws.onclose = this.callbacks.onclose;
    this.ws.onmessage = this.callbacks.onmessage;
  }
  send(message) {
    if (this.ws === void 0) {
      throw new Error("WebSocket is not connected");
    }
    this.ws.send(message);
  }
  close() {
    if (this.ws === void 0) {
      throw new Error("WebSocket is not connected");
    }
    this.ws.close();
  }
};
var GOOGLE_API_KEY_HEADER = "x-goog-api-key";
var WebAuth = class {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }
  async addAuthHeaders(headers) {
    if (headers.get(GOOGLE_API_KEY_HEADER) !== null) {
      return;
    }
    headers.append(GOOGLE_API_KEY_HEADER, this.apiKey);
  }
};
var LANGUAGE_LABEL_PREFIX = "gl-node/";
var GoogleGenAI = class {
  constructor(options2) {
    var _a;
    if (options2.apiKey == null) {
      throw new Error("An API Key must be set when running in a browser");
    }
    if (options2.project || options2.location) {
      throw new Error("Vertex AI project based authentication is not supported on browser runtimes. Please do not provide a project or location.");
    }
    this.vertexai = (_a = options2.vertexai) !== null && _a !== void 0 ? _a : false;
    this.apiKey = options2.apiKey;
    this.apiVersion = options2.apiVersion;
    const auth = new WebAuth(this.apiKey);
    this.apiClient = new ApiClient({
      auth,
      apiVersion: this.apiVersion,
      apiKey: this.apiKey,
      vertexai: this.vertexai,
      httpOptions: options2.httpOptions,
      userAgentExtra: LANGUAGE_LABEL_PREFIX + "web",
      uploader: new BrowserUploader()
    });
    this.models = new Models(this.apiClient);
    this.live = new Live(this.apiClient, auth, new BrowserWebSocketFactory());
    this.chats = new Chats(this.models, this.apiClient);
    this.caches = new Caches(this.apiClient);
    this.files = new Files(this.apiClient);
    this.operations = new Operations(this.apiClient);
  }
};

// node_modules/marked/lib/marked.esm.js
function getDefaults() {
  return {
    async: false,
    baseUrl: null,
    breaks: false,
    extensions: null,
    gfm: true,
    headerIds: true,
    headerPrefix: "",
    highlight: null,
    hooks: null,
    langPrefix: "language-",
    mangle: true,
    pedantic: false,
    renderer: null,
    sanitize: false,
    sanitizer: null,
    silent: false,
    smartypants: false,
    tokenizer: null,
    walkTokens: null,
    xhtml: false
  };
}
var defaults = getDefaults();
function changeDefaults(newDefaults) {
  defaults = newDefaults;
}
var escapeTest = /[&<>"']/;
var escapeReplace = new RegExp(escapeTest.source, "g");
var escapeTestNoEncode = /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/;
var escapeReplaceNoEncode = new RegExp(escapeTestNoEncode.source, "g");
var escapeReplacements = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
var getEscapeReplacement = (ch) => escapeReplacements[ch];
function escape(html, encode) {
  if (encode) {
    if (escapeTest.test(html)) {
      return html.replace(escapeReplace, getEscapeReplacement);
    }
  } else {
    if (escapeTestNoEncode.test(html)) {
      return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
    }
  }
  return html;
}
var unescapeTest = /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig;
function unescape(html) {
  return html.replace(unescapeTest, (_, n) => {
    n = n.toLowerCase();
    if (n === "colon") return ":";
    if (n.charAt(0) === "#") {
      return n.charAt(1) === "x" ? String.fromCharCode(parseInt(n.substring(2), 16)) : String.fromCharCode(+n.substring(1));
    }
    return "";
  });
}
var caret = /(^|[^\[])\^/g;
function edit(regex, opt) {
  regex = typeof regex === "string" ? regex : regex.source;
  opt = opt || "";
  const obj = {
    replace: (name, val) => {
      val = val.source || val;
      val = val.replace(caret, "$1");
      regex = regex.replace(name, val);
      return obj;
    },
    getRegex: () => {
      return new RegExp(regex, opt);
    }
  };
  return obj;
}
var nonWordAndColonTest = /[^\w:]/g;
var originIndependentUrl = /^$|^[a-z][a-z0-9+.-]*:|^[?#]/i;
function cleanUrl(sanitize, base, href) {
  if (sanitize) {
    let prot;
    try {
      prot = decodeURIComponent(unescape(href)).replace(nonWordAndColonTest, "").toLowerCase();
    } catch (e) {
      return null;
    }
    if (prot.indexOf("javascript:") === 0 || prot.indexOf("vbscript:") === 0 || prot.indexOf("data:") === 0) {
      return null;
    }
  }
  if (base && !originIndependentUrl.test(href)) {
    href = resolveUrl(base, href);
  }
  try {
    href = encodeURI(href).replace(/%25/g, "%");
  } catch (e) {
    return null;
  }
  return href;
}
var baseUrls = {};
var justDomain = /^[^:]+:\/*[^/]*$/;
var protocol = /^([^:]+:)[\s\S]*$/;
var domain = /^([^:]+:\/*[^/]*)[\s\S]*$/;
function resolveUrl(base, href) {
  if (!baseUrls[" " + base]) {
    if (justDomain.test(base)) {
      baseUrls[" " + base] = base + "/";
    } else {
      baseUrls[" " + base] = rtrim(base, "/", true);
    }
  }
  base = baseUrls[" " + base];
  const relativeBase = base.indexOf(":") === -1;
  if (href.substring(0, 2) === "//") {
    if (relativeBase) {
      return href;
    }
    return base.replace(protocol, "$1") + href;
  } else if (href.charAt(0) === "/") {
    if (relativeBase) {
      return href;
    }
    return base.replace(domain, "$1") + href;
  } else {
    return base + href;
  }
}
var noopTest = { exec: function noopTest2() {
} };
function splitCells(tableRow, count) {
  const row = tableRow.replace(/\|/g, (match, offset, str) => {
    let escaped = false, curr = offset;
    while (--curr >= 0 && str[curr] === "\\") escaped = !escaped;
    if (escaped) {
      return "|";
    } else {
      return " |";
    }
  }), cells = row.split(/ \|/);
  let i = 0;
  if (!cells[0].trim()) {
    cells.shift();
  }
  if (cells.length > 0 && !cells[cells.length - 1].trim()) {
    cells.pop();
  }
  if (cells.length > count) {
    cells.splice(count);
  } else {
    while (cells.length < count) cells.push("");
  }
  for (; i < cells.length; i++) {
    cells[i] = cells[i].trim().replace(/\\\|/g, "|");
  }
  return cells;
}
function rtrim(str, c, invert) {
  const l = str.length;
  if (l === 0) {
    return "";
  }
  let suffLen = 0;
  while (suffLen < l) {
    const currChar = str.charAt(l - suffLen - 1);
    if (currChar === c && !invert) {
      suffLen++;
    } else if (currChar !== c && invert) {
      suffLen++;
    } else {
      break;
    }
  }
  return str.slice(0, l - suffLen);
}
function findClosingBracket(str, b) {
  if (str.indexOf(b[1]) === -1) {
    return -1;
  }
  const l = str.length;
  let level = 0, i = 0;
  for (; i < l; i++) {
    if (str[i] === "\\") {
      i++;
    } else if (str[i] === b[0]) {
      level++;
    } else if (str[i] === b[1]) {
      level--;
      if (level < 0) {
        return i;
      }
    }
  }
  return -1;
}
function checkSanitizeDeprecation(opt) {
  if (opt && opt.sanitize && !opt.silent) {
    console.warn("marked(): sanitize and sanitizer parameters are deprecated since version 0.7.0, should not be used and will be removed in the future. Read more here: https://marked.js.org/#/USING_ADVANCED.md#options");
  }
}
function repeatString(pattern, count) {
  if (count < 1) {
    return "";
  }
  let result = "";
  while (count > 1) {
    if (count & 1) {
      result += pattern;
    }
    count >>= 1;
    pattern += pattern;
  }
  return result + pattern;
}
function outputLink(cap, link, raw, lexer2) {
  const href = link.href;
  const title = link.title ? escape(link.title) : null;
  const text = cap[1].replace(/\\([\[\]])/g, "$1");
  if (cap[0].charAt(0) !== "!") {
    lexer2.state.inLink = true;
    const token = {
      type: "link",
      raw,
      href,
      title,
      text,
      tokens: lexer2.inlineTokens(text)
    };
    lexer2.state.inLink = false;
    return token;
  }
  return {
    type: "image",
    raw,
    href,
    title,
    text: escape(text)
  };
}
function indentCodeCompensation(raw, text) {
  const matchIndentToCode = raw.match(/^(\s+)(?:```)/);
  if (matchIndentToCode === null) {
    return text;
  }
  const indentToCode = matchIndentToCode[1];
  return text.split("\n").map((node) => {
    const matchIndentInNode = node.match(/^\s+/);
    if (matchIndentInNode === null) {
      return node;
    }
    const [indentInNode] = matchIndentInNode;
    if (indentInNode.length >= indentToCode.length) {
      return node.slice(indentToCode.length);
    }
    return node;
  }).join("\n");
}
var Tokenizer = class {
  constructor(options2) {
    this.options = options2 || defaults;
  }
  space(src) {
    const cap = this.rules.block.newline.exec(src);
    if (cap && cap[0].length > 0) {
      return {
        type: "space",
        raw: cap[0]
      };
    }
  }
  code(src) {
    const cap = this.rules.block.code.exec(src);
    if (cap) {
      const text = cap[0].replace(/^ {1,4}/gm, "");
      return {
        type: "code",
        raw: cap[0],
        codeBlockStyle: "indented",
        text: !this.options.pedantic ? rtrim(text, "\n") : text
      };
    }
  }
  fences(src) {
    const cap = this.rules.block.fences.exec(src);
    if (cap) {
      const raw = cap[0];
      const text = indentCodeCompensation(raw, cap[3] || "");
      return {
        type: "code",
        raw,
        lang: cap[2] ? cap[2].trim().replace(this.rules.inline._escapes, "$1") : cap[2],
        text
      };
    }
  }
  heading(src) {
    const cap = this.rules.block.heading.exec(src);
    if (cap) {
      let text = cap[2].trim();
      if (/#$/.test(text)) {
        const trimmed = rtrim(text, "#");
        if (this.options.pedantic) {
          text = trimmed.trim();
        } else if (!trimmed || / $/.test(trimmed)) {
          text = trimmed.trim();
        }
      }
      return {
        type: "heading",
        raw: cap[0],
        depth: cap[1].length,
        text,
        tokens: this.lexer.inline(text)
      };
    }
  }
  hr(src) {
    const cap = this.rules.block.hr.exec(src);
    if (cap) {
      return {
        type: "hr",
        raw: cap[0]
      };
    }
  }
  blockquote(src) {
    const cap = this.rules.block.blockquote.exec(src);
    if (cap) {
      const text = cap[0].replace(/^ *>[ \t]?/gm, "");
      const top = this.lexer.state.top;
      this.lexer.state.top = true;
      const tokens = this.lexer.blockTokens(text);
      this.lexer.state.top = top;
      return {
        type: "blockquote",
        raw: cap[0],
        tokens,
        text
      };
    }
  }
  list(src) {
    let cap = this.rules.block.list.exec(src);
    if (cap) {
      let raw, istask, ischecked, indent, i, blankLine, endsWithBlankLine, line, nextLine, rawLine, itemContents, endEarly;
      let bull = cap[1].trim();
      const isordered = bull.length > 1;
      const list = {
        type: "list",
        raw: "",
        ordered: isordered,
        start: isordered ? +bull.slice(0, -1) : "",
        loose: false,
        items: []
      };
      bull = isordered ? `\\d{1,9}\\${bull.slice(-1)}` : `\\${bull}`;
      if (this.options.pedantic) {
        bull = isordered ? bull : "[*+-]";
      }
      const itemRegex = new RegExp(`^( {0,3}${bull})((?:[	 ][^\\n]*)?(?:\\n|$))`);
      while (src) {
        endEarly = false;
        if (!(cap = itemRegex.exec(src))) {
          break;
        }
        if (this.rules.block.hr.test(src)) {
          break;
        }
        raw = cap[0];
        src = src.substring(raw.length);
        line = cap[2].split("\n", 1)[0].replace(/^\t+/, (t) => " ".repeat(3 * t.length));
        nextLine = src.split("\n", 1)[0];
        if (this.options.pedantic) {
          indent = 2;
          itemContents = line.trimLeft();
        } else {
          indent = cap[2].search(/[^ ]/);
          indent = indent > 4 ? 1 : indent;
          itemContents = line.slice(indent);
          indent += cap[1].length;
        }
        blankLine = false;
        if (!line && /^ *$/.test(nextLine)) {
          raw += nextLine + "\n";
          src = src.substring(nextLine.length + 1);
          endEarly = true;
        }
        if (!endEarly) {
          const nextBulletRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`);
          const hrRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`);
          const fencesBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:\`\`\`|~~~)`);
          const headingBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}#`);
          while (src) {
            rawLine = src.split("\n", 1)[0];
            nextLine = rawLine;
            if (this.options.pedantic) {
              nextLine = nextLine.replace(/^ {1,4}(?=( {4})*[^ ])/g, "  ");
            }
            if (fencesBeginRegex.test(nextLine)) {
              break;
            }
            if (headingBeginRegex.test(nextLine)) {
              break;
            }
            if (nextBulletRegex.test(nextLine)) {
              break;
            }
            if (hrRegex.test(src)) {
              break;
            }
            if (nextLine.search(/[^ ]/) >= indent || !nextLine.trim()) {
              itemContents += "\n" + nextLine.slice(indent);
            } else {
              if (blankLine) {
                break;
              }
              if (line.search(/[^ ]/) >= 4) {
                break;
              }
              if (fencesBeginRegex.test(line)) {
                break;
              }
              if (headingBeginRegex.test(line)) {
                break;
              }
              if (hrRegex.test(line)) {
                break;
              }
              itemContents += "\n" + nextLine;
            }
            if (!blankLine && !nextLine.trim()) {
              blankLine = true;
            }
            raw += rawLine + "\n";
            src = src.substring(rawLine.length + 1);
            line = nextLine.slice(indent);
          }
        }
        if (!list.loose) {
          if (endsWithBlankLine) {
            list.loose = true;
          } else if (/\n *\n *$/.test(raw)) {
            endsWithBlankLine = true;
          }
        }
        if (this.options.gfm) {
          istask = /^\[[ xX]\] /.exec(itemContents);
          if (istask) {
            ischecked = istask[0] !== "[ ] ";
            itemContents = itemContents.replace(/^\[[ xX]\] +/, "");
          }
        }
        list.items.push({
          type: "list_item",
          raw,
          task: !!istask,
          checked: ischecked,
          loose: false,
          text: itemContents
        });
        list.raw += raw;
      }
      list.items[list.items.length - 1].raw = raw.trimRight();
      list.items[list.items.length - 1].text = itemContents.trimRight();
      list.raw = list.raw.trimRight();
      const l = list.items.length;
      for (i = 0; i < l; i++) {
        this.lexer.state.top = false;
        list.items[i].tokens = this.lexer.blockTokens(list.items[i].text, []);
        if (!list.loose) {
          const spacers = list.items[i].tokens.filter((t) => t.type === "space");
          const hasMultipleLineBreaks = spacers.length > 0 && spacers.some((t) => /\n.*\n/.test(t.raw));
          list.loose = hasMultipleLineBreaks;
        }
      }
      if (list.loose) {
        for (i = 0; i < l; i++) {
          list.items[i].loose = true;
        }
      }
      return list;
    }
  }
  html(src) {
    const cap = this.rules.block.html.exec(src);
    if (cap) {
      const token = {
        type: "html",
        raw: cap[0],
        pre: !this.options.sanitizer && (cap[1] === "pre" || cap[1] === "script" || cap[1] === "style"),
        text: cap[0]
      };
      if (this.options.sanitize) {
        const text = this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape(cap[0]);
        token.type = "paragraph";
        token.text = text;
        token.tokens = this.lexer.inline(text);
      }
      return token;
    }
  }
  def(src) {
    const cap = this.rules.block.def.exec(src);
    if (cap) {
      const tag = cap[1].toLowerCase().replace(/\s+/g, " ");
      const href = cap[2] ? cap[2].replace(/^<(.*)>$/, "$1").replace(this.rules.inline._escapes, "$1") : "";
      const title = cap[3] ? cap[3].substring(1, cap[3].length - 1).replace(this.rules.inline._escapes, "$1") : cap[3];
      return {
        type: "def",
        tag,
        raw: cap[0],
        href,
        title
      };
    }
  }
  table(src) {
    const cap = this.rules.block.table.exec(src);
    if (cap) {
      const item = {
        type: "table",
        header: splitCells(cap[1]).map((c) => {
          return { text: c };
        }),
        align: cap[2].replace(/^ *|\| *$/g, "").split(/ *\| */),
        rows: cap[3] && cap[3].trim() ? cap[3].replace(/\n[ \t]*$/, "").split("\n") : []
      };
      if (item.header.length === item.align.length) {
        item.raw = cap[0];
        let l = item.align.length;
        let i, j, k, row;
        for (i = 0; i < l; i++) {
          if (/^ *-+: *$/.test(item.align[i])) {
            item.align[i] = "right";
          } else if (/^ *:-+: *$/.test(item.align[i])) {
            item.align[i] = "center";
          } else if (/^ *:-+ *$/.test(item.align[i])) {
            item.align[i] = "left";
          } else {
            item.align[i] = null;
          }
        }
        l = item.rows.length;
        for (i = 0; i < l; i++) {
          item.rows[i] = splitCells(item.rows[i], item.header.length).map((c) => {
            return { text: c };
          });
        }
        l = item.header.length;
        for (j = 0; j < l; j++) {
          item.header[j].tokens = this.lexer.inline(item.header[j].text);
        }
        l = item.rows.length;
        for (j = 0; j < l; j++) {
          row = item.rows[j];
          for (k = 0; k < row.length; k++) {
            row[k].tokens = this.lexer.inline(row[k].text);
          }
        }
        return item;
      }
    }
  }
  lheading(src) {
    const cap = this.rules.block.lheading.exec(src);
    if (cap) {
      return {
        type: "heading",
        raw: cap[0],
        depth: cap[2].charAt(0) === "=" ? 1 : 2,
        text: cap[1],
        tokens: this.lexer.inline(cap[1])
      };
    }
  }
  paragraph(src) {
    const cap = this.rules.block.paragraph.exec(src);
    if (cap) {
      const text = cap[1].charAt(cap[1].length - 1) === "\n" ? cap[1].slice(0, -1) : cap[1];
      return {
        type: "paragraph",
        raw: cap[0],
        text,
        tokens: this.lexer.inline(text)
      };
    }
  }
  text(src) {
    const cap = this.rules.block.text.exec(src);
    if (cap) {
      return {
        type: "text",
        raw: cap[0],
        text: cap[0],
        tokens: this.lexer.inline(cap[0])
      };
    }
  }
  escape(src) {
    const cap = this.rules.inline.escape.exec(src);
    if (cap) {
      return {
        type: "escape",
        raw: cap[0],
        text: escape(cap[1])
      };
    }
  }
  tag(src) {
    const cap = this.rules.inline.tag.exec(src);
    if (cap) {
      if (!this.lexer.state.inLink && /^<a /i.test(cap[0])) {
        this.lexer.state.inLink = true;
      } else if (this.lexer.state.inLink && /^<\/a>/i.test(cap[0])) {
        this.lexer.state.inLink = false;
      }
      if (!this.lexer.state.inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
        this.lexer.state.inRawBlock = true;
      } else if (this.lexer.state.inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
        this.lexer.state.inRawBlock = false;
      }
      return {
        type: this.options.sanitize ? "text" : "html",
        raw: cap[0],
        inLink: this.lexer.state.inLink,
        inRawBlock: this.lexer.state.inRawBlock,
        text: this.options.sanitize ? this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape(cap[0]) : cap[0]
      };
    }
  }
  link(src) {
    const cap = this.rules.inline.link.exec(src);
    if (cap) {
      const trimmedUrl = cap[2].trim();
      if (!this.options.pedantic && /^</.test(trimmedUrl)) {
        if (!/>$/.test(trimmedUrl)) {
          return;
        }
        const rtrimSlash = rtrim(trimmedUrl.slice(0, -1), "\\");
        if ((trimmedUrl.length - rtrimSlash.length) % 2 === 0) {
          return;
        }
      } else {
        const lastParenIndex = findClosingBracket(cap[2], "()");
        if (lastParenIndex > -1) {
          const start = cap[0].indexOf("!") === 0 ? 5 : 4;
          const linkLen = start + cap[1].length + lastParenIndex;
          cap[2] = cap[2].substring(0, lastParenIndex);
          cap[0] = cap[0].substring(0, linkLen).trim();
          cap[3] = "";
        }
      }
      let href = cap[2];
      let title = "";
      if (this.options.pedantic) {
        const link = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(href);
        if (link) {
          href = link[1];
          title = link[3];
        }
      } else {
        title = cap[3] ? cap[3].slice(1, -1) : "";
      }
      href = href.trim();
      if (/^</.test(href)) {
        if (this.options.pedantic && !/>$/.test(trimmedUrl)) {
          href = href.slice(1);
        } else {
          href = href.slice(1, -1);
        }
      }
      return outputLink(cap, {
        href: href ? href.replace(this.rules.inline._escapes, "$1") : href,
        title: title ? title.replace(this.rules.inline._escapes, "$1") : title
      }, cap[0], this.lexer);
    }
  }
  reflink(src, links) {
    let cap;
    if ((cap = this.rules.inline.reflink.exec(src)) || (cap = this.rules.inline.nolink.exec(src))) {
      let link = (cap[2] || cap[1]).replace(/\s+/g, " ");
      link = links[link.toLowerCase()];
      if (!link) {
        const text = cap[0].charAt(0);
        return {
          type: "text",
          raw: text,
          text
        };
      }
      return outputLink(cap, link, cap[0], this.lexer);
    }
  }
  emStrong(src, maskedSrc, prevChar = "") {
    let match = this.rules.inline.emStrong.lDelim.exec(src);
    if (!match) return;
    if (match[3] && prevChar.match(/[\p{L}\p{N}]/u)) return;
    const nextChar = match[1] || match[2] || "";
    if (!nextChar || nextChar && (prevChar === "" || this.rules.inline.punctuation.exec(prevChar))) {
      const lLength = match[0].length - 1;
      let rDelim, rLength, delimTotal = lLength, midDelimTotal = 0;
      const endReg = match[0][0] === "*" ? this.rules.inline.emStrong.rDelimAst : this.rules.inline.emStrong.rDelimUnd;
      endReg.lastIndex = 0;
      maskedSrc = maskedSrc.slice(-1 * src.length + lLength);
      while ((match = endReg.exec(maskedSrc)) != null) {
        rDelim = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];
        if (!rDelim) continue;
        rLength = rDelim.length;
        if (match[3] || match[4]) {
          delimTotal += rLength;
          continue;
        } else if (match[5] || match[6]) {
          if (lLength % 3 && !((lLength + rLength) % 3)) {
            midDelimTotal += rLength;
            continue;
          }
        }
        delimTotal -= rLength;
        if (delimTotal > 0) continue;
        rLength = Math.min(rLength, rLength + delimTotal + midDelimTotal);
        const raw = src.slice(0, lLength + match.index + (match[0].length - rDelim.length) + rLength);
        if (Math.min(lLength, rLength) % 2) {
          const text2 = raw.slice(1, -1);
          return {
            type: "em",
            raw,
            text: text2,
            tokens: this.lexer.inlineTokens(text2)
          };
        }
        const text = raw.slice(2, -2);
        return {
          type: "strong",
          raw,
          text,
          tokens: this.lexer.inlineTokens(text)
        };
      }
    }
  }
  codespan(src) {
    const cap = this.rules.inline.code.exec(src);
    if (cap) {
      let text = cap[2].replace(/\n/g, " ");
      const hasNonSpaceChars = /[^ ]/.test(text);
      const hasSpaceCharsOnBothEnds = /^ /.test(text) && / $/.test(text);
      if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) {
        text = text.substring(1, text.length - 1);
      }
      text = escape(text, true);
      return {
        type: "codespan",
        raw: cap[0],
        text
      };
    }
  }
  br(src) {
    const cap = this.rules.inline.br.exec(src);
    if (cap) {
      return {
        type: "br",
        raw: cap[0]
      };
    }
  }
  del(src) {
    const cap = this.rules.inline.del.exec(src);
    if (cap) {
      return {
        type: "del",
        raw: cap[0],
        text: cap[2],
        tokens: this.lexer.inlineTokens(cap[2])
      };
    }
  }
  autolink(src, mangle2) {
    const cap = this.rules.inline.autolink.exec(src);
    if (cap) {
      let text, href;
      if (cap[2] === "@") {
        text = escape(this.options.mangle ? mangle2(cap[1]) : cap[1]);
        href = "mailto:" + text;
      } else {
        text = escape(cap[1]);
        href = text;
      }
      return {
        type: "link",
        raw: cap[0],
        text,
        href,
        tokens: [
          {
            type: "text",
            raw: text,
            text
          }
        ]
      };
    }
  }
  url(src, mangle2) {
    let cap;
    if (cap = this.rules.inline.url.exec(src)) {
      let text, href;
      if (cap[2] === "@") {
        text = escape(this.options.mangle ? mangle2(cap[0]) : cap[0]);
        href = "mailto:" + text;
      } else {
        let prevCapZero;
        do {
          prevCapZero = cap[0];
          cap[0] = this.rules.inline._backpedal.exec(cap[0])[0];
        } while (prevCapZero !== cap[0]);
        text = escape(cap[0]);
        if (cap[1] === "www.") {
          href = "http://" + cap[0];
        } else {
          href = cap[0];
        }
      }
      return {
        type: "link",
        raw: cap[0],
        text,
        href,
        tokens: [
          {
            type: "text",
            raw: text,
            text
          }
        ]
      };
    }
  }
  inlineText(src, smartypants2) {
    const cap = this.rules.inline.text.exec(src);
    if (cap) {
      let text;
      if (this.lexer.state.inRawBlock) {
        text = this.options.sanitize ? this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape(cap[0]) : cap[0];
      } else {
        text = escape(this.options.smartypants ? smartypants2(cap[0]) : cap[0]);
      }
      return {
        type: "text",
        raw: cap[0],
        text
      };
    }
  }
};
var block = {
  newline: /^(?: *(?:\n|$))+/,
  code: /^( {4}[^\n]+(?:\n(?: *(?:\n|$))*)?)+/,
  fences: /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,
  hr: /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,
  heading: /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,
  blockquote: /^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/,
  list: /^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/,
  html: "^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n *)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$))",
  def: /^ {0,3}\[(label)\]: *(?:\n *)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n *)?| *\n *)(title))? *(?:\n+|$)/,
  table: noopTest,
  lheading: /^((?:.|\n(?!\n))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
  // regex template, placeholders will be replaced according to different paragraph
  // interruption rules of commonmark and the original markdown spec:
  _paragraph: /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,
  text: /^[^\n]+/
};
block._label = /(?!\s*\])(?:\\.|[^\[\]\\])+/;
block._title = /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/;
block.def = edit(block.def).replace("label", block._label).replace("title", block._title).getRegex();
block.bullet = /(?:[*+-]|\d{1,9}[.)])/;
block.listItemStart = edit(/^( *)(bull) */).replace("bull", block.bullet).getRegex();
block.list = edit(block.list).replace(/bull/g, block.bullet).replace("hr", "\\n+(?=\\1?(?:(?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$))").replace("def", "\\n+(?=" + block.def.source + ")").getRegex();
block._tag = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
block._comment = /<!--(?!-?>)[\s\S]*?(?:-->|$)/;
block.html = edit(block.html, "i").replace("comment", block._comment).replace("tag", block._tag).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
block.paragraph = edit(block._paragraph).replace("hr", block.hr).replace("heading", " {0,3}#{1,6} ").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", block._tag).getRegex();
block.blockquote = edit(block.blockquote).replace("paragraph", block.paragraph).getRegex();
block.normal = { ...block };
block.gfm = {
  ...block.normal,
  table: "^ *([^\\n ].*\\|.*)\\n {0,3}(?:\\| *)?(:?-+:? *(?:\\| *:?-+:? *)*)(?:\\| *)?(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)"
  // Cells
};
block.gfm.table = edit(block.gfm.table).replace("hr", block.hr).replace("heading", " {0,3}#{1,6} ").replace("blockquote", " {0,3}>").replace("code", " {4}[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", block._tag).getRegex();
block.gfm.paragraph = edit(block._paragraph).replace("hr", block.hr).replace("heading", " {0,3}#{1,6} ").replace("|lheading", "").replace("table", block.gfm.table).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", block._tag).getRegex();
block.pedantic = {
  ...block.normal,
  html: edit(
    `^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`
  ).replace("comment", block._comment).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
  heading: /^(#{1,6})(.*)(?:\n+|$)/,
  fences: noopTest,
  // fences not supported
  lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
  paragraph: edit(block.normal._paragraph).replace("hr", block.hr).replace("heading", " *#{1,6} *[^\n]").replace("lheading", block.lheading).replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").getRegex()
};
var inline = {
  escape: /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,
  autolink: /^<(scheme:[^\s\x00-\x1f<>]*|email)>/,
  url: noopTest,
  tag: "^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>",
  // CDATA section
  link: /^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/,
  reflink: /^!?\[(label)\]\[(ref)\]/,
  nolink: /^!?\[(ref)\](?:\[\])?/,
  reflinkSearch: "reflink|nolink(?!\\()",
  emStrong: {
    lDelim: /^(?:\*+(?:([punct_])|[^\s*]))|^_+(?:([punct*])|([^\s_]))/,
    //        (1) and (2) can only be a Right Delimiter. (3) and (4) can only be Left.  (5) and (6) can be either Left or Right.
    //          () Skip orphan inside strong                                      () Consume to delim     (1) #***                (2) a***#, a***                             (3) #***a, ***a                 (4) ***#              (5) #***#                 (6) a***a
    rDelimAst: /^(?:[^_*\\]|\\.)*?\_\_(?:[^_*\\]|\\.)*?\*(?:[^_*\\]|\\.)*?(?=\_\_)|(?:[^*\\]|\\.)+(?=[^*])|[punct_](\*+)(?=[\s]|$)|(?:[^punct*_\s\\]|\\.)(\*+)(?=[punct_\s]|$)|[punct_\s](\*+)(?=[^punct*_\s])|[\s](\*+)(?=[punct_])|[punct_](\*+)(?=[punct_])|(?:[^punct*_\s\\]|\\.)(\*+)(?=[^punct*_\s])/,
    rDelimUnd: /^(?:[^_*\\]|\\.)*?\*\*(?:[^_*\\]|\\.)*?\_(?:[^_*\\]|\\.)*?(?=\*\*)|(?:[^_\\]|\\.)+(?=[^_])|[punct*](\_+)(?=[\s]|$)|(?:[^punct*_\s\\]|\\.)(\_+)(?=[punct*\s]|$)|[punct*\s](\_+)(?=[^punct*_\s])|[\s](\_+)(?=[punct*])|[punct*](\_+)(?=[punct*])/
    // ^- Not allowed for _
  },
  code: /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,
  br: /^( {2,}|\\)\n(?!\s*$)/,
  del: noopTest,
  text: /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,
  punctuation: /^([\spunctuation])/
};
inline._punctuation = "!\"#$%&'()+\\-.,/:;<=>?@\\[\\]`^{|}~";
inline.punctuation = edit(inline.punctuation).replace(/punctuation/g, inline._punctuation).getRegex();
inline.blockSkip = /\[[^\]]*?\]\([^\)]*?\)|`[^`]*?`|<[^>]*?>/g;
inline.escapedEmSt = /(?:^|[^\\])(?:\\\\)*\\[*_]/g;
inline._comment = edit(block._comment).replace("(?:-->|$)", "-->").getRegex();
inline.emStrong.lDelim = edit(inline.emStrong.lDelim).replace(/punct/g, inline._punctuation).getRegex();
inline.emStrong.rDelimAst = edit(inline.emStrong.rDelimAst, "g").replace(/punct/g, inline._punctuation).getRegex();
inline.emStrong.rDelimUnd = edit(inline.emStrong.rDelimUnd, "g").replace(/punct/g, inline._punctuation).getRegex();
inline._escapes = /\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/g;
inline._scheme = /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/;
inline._email = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/;
inline.autolink = edit(inline.autolink).replace("scheme", inline._scheme).replace("email", inline._email).getRegex();
inline._attribute = /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/;
inline.tag = edit(inline.tag).replace("comment", inline._comment).replace("attribute", inline._attribute).getRegex();
inline._label = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
inline._href = /<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/;
inline._title = /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/;
inline.link = edit(inline.link).replace("label", inline._label).replace("href", inline._href).replace("title", inline._title).getRegex();
inline.reflink = edit(inline.reflink).replace("label", inline._label).replace("ref", block._label).getRegex();
inline.nolink = edit(inline.nolink).replace("ref", block._label).getRegex();
inline.reflinkSearch = edit(inline.reflinkSearch, "g").replace("reflink", inline.reflink).replace("nolink", inline.nolink).getRegex();
inline.normal = { ...inline };
inline.pedantic = {
  ...inline.normal,
  strong: {
    start: /^__|\*\*/,
    middle: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
    endAst: /\*\*(?!\*)/g,
    endUnd: /__(?!_)/g
  },
  em: {
    start: /^_|\*/,
    middle: /^()\*(?=\S)([\s\S]*?\S)\*(?!\*)|^_(?=\S)([\s\S]*?\S)_(?!_)/,
    endAst: /\*(?!\*)/g,
    endUnd: /_(?!_)/g
  },
  link: edit(/^!?\[(label)\]\((.*?)\)/).replace("label", inline._label).getRegex(),
  reflink: edit(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", inline._label).getRegex()
};
inline.gfm = {
  ...inline.normal,
  escape: edit(inline.escape).replace("])", "~|])").getRegex(),
  _extended_email: /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/,
  url: /^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/,
  _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
  del: /^(~~?)(?=[^\s~])([\s\S]*?[^\s~])\1(?=[^~]|$)/,
  text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/
};
inline.gfm.url = edit(inline.gfm.url, "i").replace("email", inline.gfm._extended_email).getRegex();
inline.breaks = {
  ...inline.gfm,
  br: edit(inline.br).replace("{2,}", "*").getRegex(),
  text: edit(inline.gfm.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex()
};
function smartypants(text) {
  return text.replace(/---/g, "\u2014").replace(/--/g, "\u2013").replace(/(^|[-\u2014/(\[{"\s])'/g, "$1\u2018").replace(/'/g, "\u2019").replace(/(^|[-\u2014/(\[{\u2018\s])"/g, "$1\u201C").replace(/"/g, "\u201D").replace(/\.{3}/g, "\u2026");
}
function mangle(text) {
  let out = "", i, ch;
  const l = text.length;
  for (i = 0; i < l; i++) {
    ch = text.charCodeAt(i);
    if (Math.random() > 0.5) {
      ch = "x" + ch.toString(16);
    }
    out += "&#" + ch + ";";
  }
  return out;
}
var Lexer = class _Lexer {
  constructor(options2) {
    this.tokens = [];
    this.tokens.links = /* @__PURE__ */ Object.create(null);
    this.options = options2 || defaults;
    this.options.tokenizer = this.options.tokenizer || new Tokenizer();
    this.tokenizer = this.options.tokenizer;
    this.tokenizer.options = this.options;
    this.tokenizer.lexer = this;
    this.inlineQueue = [];
    this.state = {
      inLink: false,
      inRawBlock: false,
      top: true
    };
    const rules = {
      block: block.normal,
      inline: inline.normal
    };
    if (this.options.pedantic) {
      rules.block = block.pedantic;
      rules.inline = inline.pedantic;
    } else if (this.options.gfm) {
      rules.block = block.gfm;
      if (this.options.breaks) {
        rules.inline = inline.breaks;
      } else {
        rules.inline = inline.gfm;
      }
    }
    this.tokenizer.rules = rules;
  }
  /**
   * Expose Rules
   */
  static get rules() {
    return {
      block,
      inline
    };
  }
  /**
   * Static Lex Method
   */
  static lex(src, options2) {
    const lexer2 = new _Lexer(options2);
    return lexer2.lex(src);
  }
  /**
   * Static Lex Inline Method
   */
  static lexInline(src, options2) {
    const lexer2 = new _Lexer(options2);
    return lexer2.inlineTokens(src);
  }
  /**
   * Preprocessing
   */
  lex(src) {
    src = src.replace(/\r\n|\r/g, "\n");
    this.blockTokens(src, this.tokens);
    let next;
    while (next = this.inlineQueue.shift()) {
      this.inlineTokens(next.src, next.tokens);
    }
    return this.tokens;
  }
  /**
   * Lexing
   */
  blockTokens(src, tokens = []) {
    if (this.options.pedantic) {
      src = src.replace(/\t/g, "    ").replace(/^ +$/gm, "");
    } else {
      src = src.replace(/^( *)(\t+)/gm, (_, leading, tabs) => {
        return leading + "    ".repeat(tabs.length);
      });
    }
    let token, lastToken, cutSrc, lastParagraphClipped;
    while (src) {
      if (this.options.extensions && this.options.extensions.block && this.options.extensions.block.some((extTokenizer) => {
        if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          return true;
        }
        return false;
      })) {
        continue;
      }
      if (token = this.tokenizer.space(src)) {
        src = src.substring(token.raw.length);
        if (token.raw.length === 1 && tokens.length > 0) {
          tokens[tokens.length - 1].raw += "\n";
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (token = this.tokenizer.code(src)) {
        src = src.substring(token.raw.length);
        lastToken = tokens[tokens.length - 1];
        if (lastToken && (lastToken.type === "paragraph" || lastToken.type === "text")) {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.text;
          this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (token = this.tokenizer.fences(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.heading(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.hr(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.blockquote(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.list(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.html(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.def(src)) {
        src = src.substring(token.raw.length);
        lastToken = tokens[tokens.length - 1];
        if (lastToken && (lastToken.type === "paragraph" || lastToken.type === "text")) {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.raw;
          this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
        } else if (!this.tokens.links[token.tag]) {
          this.tokens.links[token.tag] = {
            href: token.href,
            title: token.title
          };
        }
        continue;
      }
      if (token = this.tokenizer.table(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.lheading(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      cutSrc = src;
      if (this.options.extensions && this.options.extensions.startBlock) {
        let startIndex = Infinity;
        const tempSrc = src.slice(1);
        let tempStart;
        this.options.extensions.startBlock.forEach(function(getStartIndex) {
          tempStart = getStartIndex.call({ lexer: this }, tempSrc);
          if (typeof tempStart === "number" && tempStart >= 0) {
            startIndex = Math.min(startIndex, tempStart);
          }
        });
        if (startIndex < Infinity && startIndex >= 0) {
          cutSrc = src.substring(0, startIndex + 1);
        }
      }
      if (this.state.top && (token = this.tokenizer.paragraph(cutSrc))) {
        lastToken = tokens[tokens.length - 1];
        if (lastParagraphClipped && lastToken.type === "paragraph") {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.text;
          this.inlineQueue.pop();
          this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
        } else {
          tokens.push(token);
        }
        lastParagraphClipped = cutSrc.length !== src.length;
        src = src.substring(token.raw.length);
        continue;
      }
      if (token = this.tokenizer.text(src)) {
        src = src.substring(token.raw.length);
        lastToken = tokens[tokens.length - 1];
        if (lastToken && lastToken.type === "text") {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.text;
          this.inlineQueue.pop();
          this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (src) {
        const errMsg = "Infinite loop on byte: " + src.charCodeAt(0);
        if (this.options.silent) {
          console.error(errMsg);
          break;
        } else {
          throw new Error(errMsg);
        }
      }
    }
    this.state.top = true;
    return tokens;
  }
  inline(src, tokens = []) {
    this.inlineQueue.push({ src, tokens });
    return tokens;
  }
  /**
   * Lexing/Compiling
   */
  inlineTokens(src, tokens = []) {
    let token, lastToken, cutSrc;
    let maskedSrc = src;
    let match;
    let keepPrevChar, prevChar;
    if (this.tokens.links) {
      const links = Object.keys(this.tokens.links);
      if (links.length > 0) {
        while ((match = this.tokenizer.rules.inline.reflinkSearch.exec(maskedSrc)) != null) {
          if (links.includes(match[0].slice(match[0].lastIndexOf("[") + 1, -1))) {
            maskedSrc = maskedSrc.slice(0, match.index) + "[" + repeatString("a", match[0].length - 2) + "]" + maskedSrc.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex);
          }
        }
      }
    }
    while ((match = this.tokenizer.rules.inline.blockSkip.exec(maskedSrc)) != null) {
      maskedSrc = maskedSrc.slice(0, match.index) + "[" + repeatString("a", match[0].length - 2) + "]" + maskedSrc.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
    }
    while ((match = this.tokenizer.rules.inline.escapedEmSt.exec(maskedSrc)) != null) {
      maskedSrc = maskedSrc.slice(0, match.index + match[0].length - 2) + "++" + maskedSrc.slice(this.tokenizer.rules.inline.escapedEmSt.lastIndex);
      this.tokenizer.rules.inline.escapedEmSt.lastIndex--;
    }
    while (src) {
      if (!keepPrevChar) {
        prevChar = "";
      }
      keepPrevChar = false;
      if (this.options.extensions && this.options.extensions.inline && this.options.extensions.inline.some((extTokenizer) => {
        if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          return true;
        }
        return false;
      })) {
        continue;
      }
      if (token = this.tokenizer.escape(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.tag(src)) {
        src = src.substring(token.raw.length);
        lastToken = tokens[tokens.length - 1];
        if (lastToken && token.type === "text" && lastToken.type === "text") {
          lastToken.raw += token.raw;
          lastToken.text += token.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (token = this.tokenizer.link(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.reflink(src, this.tokens.links)) {
        src = src.substring(token.raw.length);
        lastToken = tokens[tokens.length - 1];
        if (lastToken && token.type === "text" && lastToken.type === "text") {
          lastToken.raw += token.raw;
          lastToken.text += token.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (token = this.tokenizer.emStrong(src, maskedSrc, prevChar)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.codespan(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.br(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.del(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.autolink(src, mangle)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (!this.state.inLink && (token = this.tokenizer.url(src, mangle))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      cutSrc = src;
      if (this.options.extensions && this.options.extensions.startInline) {
        let startIndex = Infinity;
        const tempSrc = src.slice(1);
        let tempStart;
        this.options.extensions.startInline.forEach(function(getStartIndex) {
          tempStart = getStartIndex.call({ lexer: this }, tempSrc);
          if (typeof tempStart === "number" && tempStart >= 0) {
            startIndex = Math.min(startIndex, tempStart);
          }
        });
        if (startIndex < Infinity && startIndex >= 0) {
          cutSrc = src.substring(0, startIndex + 1);
        }
      }
      if (token = this.tokenizer.inlineText(cutSrc, smartypants)) {
        src = src.substring(token.raw.length);
        if (token.raw.slice(-1) !== "_") {
          prevChar = token.raw.slice(-1);
        }
        keepPrevChar = true;
        lastToken = tokens[tokens.length - 1];
        if (lastToken && lastToken.type === "text") {
          lastToken.raw += token.raw;
          lastToken.text += token.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (src) {
        const errMsg = "Infinite loop on byte: " + src.charCodeAt(0);
        if (this.options.silent) {
          console.error(errMsg);
          break;
        } else {
          throw new Error(errMsg);
        }
      }
    }
    return tokens;
  }
};
var Renderer = class {
  constructor(options2) {
    this.options = options2 || defaults;
  }
  code(code, infostring, escaped) {
    const lang = (infostring || "").match(/\S*/)[0];
    if (this.options.highlight) {
      const out = this.options.highlight(code, lang);
      if (out != null && out !== code) {
        escaped = true;
        code = out;
      }
    }
    code = code.replace(/\n$/, "") + "\n";
    if (!lang) {
      return "<pre><code>" + (escaped ? code : escape(code, true)) + "</code></pre>\n";
    }
    return '<pre><code class="' + this.options.langPrefix + escape(lang) + '">' + (escaped ? code : escape(code, true)) + "</code></pre>\n";
  }
  /**
   * @param {string} quote
   */
  blockquote(quote) {
    return `<blockquote>
${quote}</blockquote>
`;
  }
  html(html) {
    return html;
  }
  /**
   * @param {string} text
   * @param {string} level
   * @param {string} raw
   * @param {any} slugger
   */
  heading(text, level, raw, slugger) {
    if (this.options.headerIds) {
      const id = this.options.headerPrefix + slugger.slug(raw);
      return `<h${level} id="${id}">${text}</h${level}>
`;
    }
    return `<h${level}>${text}</h${level}>
`;
  }
  hr() {
    return this.options.xhtml ? "<hr/>\n" : "<hr>\n";
  }
  list(body, ordered, start) {
    const type = ordered ? "ol" : "ul", startatt = ordered && start !== 1 ? ' start="' + start + '"' : "";
    return "<" + type + startatt + ">\n" + body + "</" + type + ">\n";
  }
  /**
   * @param {string} text
   */
  listitem(text) {
    return `<li>${text}</li>
`;
  }
  checkbox(checked) {
    return "<input " + (checked ? 'checked="" ' : "") + 'disabled="" type="checkbox"' + (this.options.xhtml ? " /" : "") + "> ";
  }
  /**
   * @param {string} text
   */
  paragraph(text) {
    return `<p>${text}</p>
`;
  }
  /**
   * @param {string} header
   * @param {string} body
   */
  table(header, body) {
    if (body) body = `<tbody>${body}</tbody>`;
    return "<table>\n<thead>\n" + header + "</thead>\n" + body + "</table>\n";
  }
  /**
   * @param {string} content
   */
  tablerow(content) {
    return `<tr>
${content}</tr>
`;
  }
  tablecell(content, flags) {
    const type = flags.header ? "th" : "td";
    const tag = flags.align ? `<${type} align="${flags.align}">` : `<${type}>`;
    return tag + content + `</${type}>
`;
  }
  /**
   * span level renderer
   * @param {string} text
   */
  strong(text) {
    return `<strong>${text}</strong>`;
  }
  /**
   * @param {string} text
   */
  em(text) {
    return `<em>${text}</em>`;
  }
  /**
   * @param {string} text
   */
  codespan(text) {
    return `<code>${text}</code>`;
  }
  br() {
    return this.options.xhtml ? "<br/>" : "<br>";
  }
  /**
   * @param {string} text
   */
  del(text) {
    return `<del>${text}</del>`;
  }
  /**
   * @param {string} href
   * @param {string} title
   * @param {string} text
   */
  link(href, title, text) {
    href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
    if (href === null) {
      return text;
    }
    let out = '<a href="' + href + '"';
    if (title) {
      out += ' title="' + title + '"';
    }
    out += ">" + text + "</a>";
    return out;
  }
  /**
   * @param {string} href
   * @param {string} title
   * @param {string} text
   */
  image(href, title, text) {
    href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
    if (href === null) {
      return text;
    }
    let out = `<img src="${href}" alt="${text}"`;
    if (title) {
      out += ` title="${title}"`;
    }
    out += this.options.xhtml ? "/>" : ">";
    return out;
  }
  text(text) {
    return text;
  }
};
var TextRenderer = class {
  // no need for block level renderers
  strong(text) {
    return text;
  }
  em(text) {
    return text;
  }
  codespan(text) {
    return text;
  }
  del(text) {
    return text;
  }
  html(text) {
    return text;
  }
  text(text) {
    return text;
  }
  link(href, title, text) {
    return "" + text;
  }
  image(href, title, text) {
    return "" + text;
  }
  br() {
    return "";
  }
};
var Slugger = class {
  constructor() {
    this.seen = {};
  }
  /**
   * @param {string} value
   */
  serialize(value) {
    return value.toLowerCase().trim().replace(/<[!\/a-z].*?>/ig, "").replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, "").replace(/\s/g, "-");
  }
  /**
   * Finds the next safe (unique) slug to use
   * @param {string} originalSlug
   * @param {boolean} isDryRun
   */
  getNextSafeSlug(originalSlug, isDryRun) {
    let slug = originalSlug;
    let occurenceAccumulator = 0;
    if (this.seen.hasOwnProperty(slug)) {
      occurenceAccumulator = this.seen[originalSlug];
      do {
        occurenceAccumulator++;
        slug = originalSlug + "-" + occurenceAccumulator;
      } while (this.seen.hasOwnProperty(slug));
    }
    if (!isDryRun) {
      this.seen[originalSlug] = occurenceAccumulator;
      this.seen[slug] = 0;
    }
    return slug;
  }
  /**
   * Convert string to unique id
   * @param {object} [options]
   * @param {boolean} [options.dryrun] Generates the next unique slug without
   * updating the internal accumulator.
   */
  slug(value, options2 = {}) {
    const slug = this.serialize(value);
    return this.getNextSafeSlug(slug, options2.dryrun);
  }
};
var Parser = class _Parser {
  constructor(options2) {
    this.options = options2 || defaults;
    this.options.renderer = this.options.renderer || new Renderer();
    this.renderer = this.options.renderer;
    this.renderer.options = this.options;
    this.textRenderer = new TextRenderer();
    this.slugger = new Slugger();
  }
  /**
   * Static Parse Method
   */
  static parse(tokens, options2) {
    const parser2 = new _Parser(options2);
    return parser2.parse(tokens);
  }
  /**
   * Static Parse Inline Method
   */
  static parseInline(tokens, options2) {
    const parser2 = new _Parser(options2);
    return parser2.parseInline(tokens);
  }
  /**
   * Parse Loop
   */
  parse(tokens, top = true) {
    let out = "", i, j, k, l2, l3, row, cell, header, body, token, ordered, start, loose, itemBody, item, checked, task, checkbox, ret;
    const l = tokens.length;
    for (i = 0; i < l; i++) {
      token = tokens[i];
      if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token.type]) {
        ret = this.options.extensions.renderers[token.type].call({ parser: this }, token);
        if (ret !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "paragraph", "text"].includes(token.type)) {
          out += ret || "";
          continue;
        }
      }
      switch (token.type) {
        case "space": {
          continue;
        }
        case "hr": {
          out += this.renderer.hr();
          continue;
        }
        case "heading": {
          out += this.renderer.heading(
            this.parseInline(token.tokens),
            token.depth,
            unescape(this.parseInline(token.tokens, this.textRenderer)),
            this.slugger
          );
          continue;
        }
        case "code": {
          out += this.renderer.code(
            token.text,
            token.lang,
            token.escaped
          );
          continue;
        }
        case "table": {
          header = "";
          cell = "";
          l2 = token.header.length;
          for (j = 0; j < l2; j++) {
            cell += this.renderer.tablecell(
              this.parseInline(token.header[j].tokens),
              { header: true, align: token.align[j] }
            );
          }
          header += this.renderer.tablerow(cell);
          body = "";
          l2 = token.rows.length;
          for (j = 0; j < l2; j++) {
            row = token.rows[j];
            cell = "";
            l3 = row.length;
            for (k = 0; k < l3; k++) {
              cell += this.renderer.tablecell(
                this.parseInline(row[k].tokens),
                { header: false, align: token.align[k] }
              );
            }
            body += this.renderer.tablerow(cell);
          }
          out += this.renderer.table(header, body);
          continue;
        }
        case "blockquote": {
          body = this.parse(token.tokens);
          out += this.renderer.blockquote(body);
          continue;
        }
        case "list": {
          ordered = token.ordered;
          start = token.start;
          loose = token.loose;
          l2 = token.items.length;
          body = "";
          for (j = 0; j < l2; j++) {
            item = token.items[j];
            checked = item.checked;
            task = item.task;
            itemBody = "";
            if (item.task) {
              checkbox = this.renderer.checkbox(checked);
              if (loose) {
                if (item.tokens.length > 0 && item.tokens[0].type === "paragraph") {
                  item.tokens[0].text = checkbox + " " + item.tokens[0].text;
                  if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === "text") {
                    item.tokens[0].tokens[0].text = checkbox + " " + item.tokens[0].tokens[0].text;
                  }
                } else {
                  item.tokens.unshift({
                    type: "text",
                    text: checkbox
                  });
                }
              } else {
                itemBody += checkbox;
              }
            }
            itemBody += this.parse(item.tokens, loose);
            body += this.renderer.listitem(itemBody, task, checked);
          }
          out += this.renderer.list(body, ordered, start);
          continue;
        }
        case "html": {
          out += this.renderer.html(token.text);
          continue;
        }
        case "paragraph": {
          out += this.renderer.paragraph(this.parseInline(token.tokens));
          continue;
        }
        case "text": {
          body = token.tokens ? this.parseInline(token.tokens) : token.text;
          while (i + 1 < l && tokens[i + 1].type === "text") {
            token = tokens[++i];
            body += "\n" + (token.tokens ? this.parseInline(token.tokens) : token.text);
          }
          out += top ? this.renderer.paragraph(body) : body;
          continue;
        }
        default: {
          const errMsg = 'Token with "' + token.type + '" type was not found.';
          if (this.options.silent) {
            console.error(errMsg);
            return;
          } else {
            throw new Error(errMsg);
          }
        }
      }
    }
    return out;
  }
  /**
   * Parse Inline Tokens
   */
  parseInline(tokens, renderer) {
    renderer = renderer || this.renderer;
    let out = "", i, token, ret;
    const l = tokens.length;
    for (i = 0; i < l; i++) {
      token = tokens[i];
      if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token.type]) {
        ret = this.options.extensions.renderers[token.type].call({ parser: this }, token);
        if (ret !== false || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(token.type)) {
          out += ret || "";
          continue;
        }
      }
      switch (token.type) {
        case "escape": {
          out += renderer.text(token.text);
          break;
        }
        case "html": {
          out += renderer.html(token.text);
          break;
        }
        case "link": {
          out += renderer.link(token.href, token.title, this.parseInline(token.tokens, renderer));
          break;
        }
        case "image": {
          out += renderer.image(token.href, token.title, token.text);
          break;
        }
        case "strong": {
          out += renderer.strong(this.parseInline(token.tokens, renderer));
          break;
        }
        case "em": {
          out += renderer.em(this.parseInline(token.tokens, renderer));
          break;
        }
        case "codespan": {
          out += renderer.codespan(token.text);
          break;
        }
        case "br": {
          out += renderer.br();
          break;
        }
        case "del": {
          out += renderer.del(this.parseInline(token.tokens, renderer));
          break;
        }
        case "text": {
          out += renderer.text(token.text);
          break;
        }
        default: {
          const errMsg = 'Token with "' + token.type + '" type was not found.';
          if (this.options.silent) {
            console.error(errMsg);
            return;
          } else {
            throw new Error(errMsg);
          }
        }
      }
    }
    return out;
  }
};
var Hooks = class {
  constructor(options2) {
    this.options = options2 || defaults;
  }
  static passThroughHooks = /* @__PURE__ */ new Set([
    "preprocess",
    "postprocess"
  ]);
  /**
   * Process markdown before marked
   */
  preprocess(markdown) {
    return markdown;
  }
  /**
   * Process HTML after marked is finished
   */
  postprocess(html) {
    return html;
  }
};
function onError(silent, async, callback) {
  return (e) => {
    e.message += "\nPlease report this to https://github.com/markedjs/marked.";
    if (silent) {
      const msg = "<p>An error occurred:</p><pre>" + escape(e.message + "", true) + "</pre>";
      if (async) {
        return Promise.resolve(msg);
      }
      if (callback) {
        callback(null, msg);
        return;
      }
      return msg;
    }
    if (async) {
      return Promise.reject(e);
    }
    if (callback) {
      callback(e);
      return;
    }
    throw e;
  };
}
function parseMarkdown(lexer2, parser2) {
  return (src, opt, callback) => {
    if (typeof opt === "function") {
      callback = opt;
      opt = null;
    }
    const origOpt = { ...opt };
    opt = { ...marked.defaults, ...origOpt };
    const throwError = onError(opt.silent, opt.async, callback);
    if (typeof src === "undefined" || src === null) {
      return throwError(new Error("marked(): input parameter is undefined or null"));
    }
    if (typeof src !== "string") {
      return throwError(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(src) + ", string expected"));
    }
    checkSanitizeDeprecation(opt);
    if (opt.hooks) {
      opt.hooks.options = opt;
    }
    if (callback) {
      const highlight = opt.highlight;
      let tokens;
      try {
        if (opt.hooks) {
          src = opt.hooks.preprocess(src);
        }
        tokens = lexer2(src, opt);
      } catch (e) {
        return throwError(e);
      }
      const done = function(err) {
        let out;
        if (!err) {
          try {
            if (opt.walkTokens) {
              marked.walkTokens(tokens, opt.walkTokens);
            }
            out = parser2(tokens, opt);
            if (opt.hooks) {
              out = opt.hooks.postprocess(out);
            }
          } catch (e) {
            err = e;
          }
        }
        opt.highlight = highlight;
        return err ? throwError(err) : callback(null, out);
      };
      if (!highlight || highlight.length < 3) {
        return done();
      }
      delete opt.highlight;
      if (!tokens.length) return done();
      let pending = 0;
      marked.walkTokens(tokens, function(token) {
        if (token.type === "code") {
          pending++;
          setTimeout(() => {
            highlight(token.text, token.lang, function(err, code) {
              if (err) {
                return done(err);
              }
              if (code != null && code !== token.text) {
                token.text = code;
                token.escaped = true;
              }
              pending--;
              if (pending === 0) {
                done();
              }
            });
          }, 0);
        }
      });
      if (pending === 0) {
        done();
      }
      return;
    }
    if (opt.async) {
      return Promise.resolve(opt.hooks ? opt.hooks.preprocess(src) : src).then((src2) => lexer2(src2, opt)).then((tokens) => opt.walkTokens ? Promise.all(marked.walkTokens(tokens, opt.walkTokens)).then(() => tokens) : tokens).then((tokens) => parser2(tokens, opt)).then((html) => opt.hooks ? opt.hooks.postprocess(html) : html).catch(throwError);
    }
    try {
      if (opt.hooks) {
        src = opt.hooks.preprocess(src);
      }
      const tokens = lexer2(src, opt);
      if (opt.walkTokens) {
        marked.walkTokens(tokens, opt.walkTokens);
      }
      let html = parser2(tokens, opt);
      if (opt.hooks) {
        html = opt.hooks.postprocess(html);
      }
      return html;
    } catch (e) {
      return throwError(e);
    }
  };
}
function marked(src, opt, callback) {
  return parseMarkdown(Lexer.lex, Parser.parse)(src, opt, callback);
}
marked.options = marked.setOptions = function(opt) {
  marked.defaults = { ...marked.defaults, ...opt };
  changeDefaults(marked.defaults);
  return marked;
};
marked.getDefaults = getDefaults;
marked.defaults = defaults;
marked.use = function(...args) {
  const extensions = marked.defaults.extensions || { renderers: {}, childTokens: {} };
  args.forEach((pack) => {
    const opts = { ...pack };
    opts.async = marked.defaults.async || opts.async || false;
    if (pack.extensions) {
      pack.extensions.forEach((ext) => {
        if (!ext.name) {
          throw new Error("extension name required");
        }
        if (ext.renderer) {
          const prevRenderer = extensions.renderers[ext.name];
          if (prevRenderer) {
            extensions.renderers[ext.name] = function(...args2) {
              let ret = ext.renderer.apply(this, args2);
              if (ret === false) {
                ret = prevRenderer.apply(this, args2);
              }
              return ret;
            };
          } else {
            extensions.renderers[ext.name] = ext.renderer;
          }
        }
        if (ext.tokenizer) {
          if (!ext.level || ext.level !== "block" && ext.level !== "inline") {
            throw new Error("extension level must be 'block' or 'inline'");
          }
          if (extensions[ext.level]) {
            extensions[ext.level].unshift(ext.tokenizer);
          } else {
            extensions[ext.level] = [ext.tokenizer];
          }
          if (ext.start) {
            if (ext.level === "block") {
              if (extensions.startBlock) {
                extensions.startBlock.push(ext.start);
              } else {
                extensions.startBlock = [ext.start];
              }
            } else if (ext.level === "inline") {
              if (extensions.startInline) {
                extensions.startInline.push(ext.start);
              } else {
                extensions.startInline = [ext.start];
              }
            }
          }
        }
        if (ext.childTokens) {
          extensions.childTokens[ext.name] = ext.childTokens;
        }
      });
      opts.extensions = extensions;
    }
    if (pack.renderer) {
      const renderer = marked.defaults.renderer || new Renderer();
      for (const prop in pack.renderer) {
        const prevRenderer = renderer[prop];
        renderer[prop] = (...args2) => {
          let ret = pack.renderer[prop].apply(renderer, args2);
          if (ret === false) {
            ret = prevRenderer.apply(renderer, args2);
          }
          return ret;
        };
      }
      opts.renderer = renderer;
    }
    if (pack.tokenizer) {
      const tokenizer = marked.defaults.tokenizer || new Tokenizer();
      for (const prop in pack.tokenizer) {
        const prevTokenizer = tokenizer[prop];
        tokenizer[prop] = (...args2) => {
          let ret = pack.tokenizer[prop].apply(tokenizer, args2);
          if (ret === false) {
            ret = prevTokenizer.apply(tokenizer, args2);
          }
          return ret;
        };
      }
      opts.tokenizer = tokenizer;
    }
    if (pack.hooks) {
      const hooks = marked.defaults.hooks || new Hooks();
      for (const prop in pack.hooks) {
        const prevHook = hooks[prop];
        if (Hooks.passThroughHooks.has(prop)) {
          hooks[prop] = (arg) => {
            if (marked.defaults.async) {
              return Promise.resolve(pack.hooks[prop].call(hooks, arg)).then((ret2) => {
                return prevHook.call(hooks, ret2);
              });
            }
            const ret = pack.hooks[prop].call(hooks, arg);
            return prevHook.call(hooks, ret);
          };
        } else {
          hooks[prop] = (...args2) => {
            let ret = pack.hooks[prop].apply(hooks, args2);
            if (ret === false) {
              ret = prevHook.apply(hooks, args2);
            }
            return ret;
          };
        }
      }
      opts.hooks = hooks;
    }
    if (pack.walkTokens) {
      const walkTokens2 = marked.defaults.walkTokens;
      opts.walkTokens = function(token) {
        let values = [];
        values.push(pack.walkTokens.call(this, token));
        if (walkTokens2) {
          values = values.concat(walkTokens2.call(this, token));
        }
        return values;
      };
    }
    marked.setOptions(opts);
  });
};
marked.walkTokens = function(tokens, callback) {
  let values = [];
  for (const token of tokens) {
    values = values.concat(callback.call(marked, token));
    switch (token.type) {
      case "table": {
        for (const cell of token.header) {
          values = values.concat(marked.walkTokens(cell.tokens, callback));
        }
        for (const row of token.rows) {
          for (const cell of row) {
            values = values.concat(marked.walkTokens(cell.tokens, callback));
          }
        }
        break;
      }
      case "list": {
        values = values.concat(marked.walkTokens(token.items, callback));
        break;
      }
      default: {
        if (marked.defaults.extensions && marked.defaults.extensions.childTokens && marked.defaults.extensions.childTokens[token.type]) {
          marked.defaults.extensions.childTokens[token.type].forEach(function(childTokens) {
            values = values.concat(marked.walkTokens(token[childTokens], callback));
          });
        } else if (token.tokens) {
          values = values.concat(marked.walkTokens(token.tokens, callback));
        }
      }
    }
  }
  return values;
};
marked.parseInline = parseMarkdown(Lexer.lexInline, Parser.parseInline);
marked.Parser = Parser;
marked.parser = Parser.parse;
marked.Renderer = Renderer;
marked.TextRenderer = TextRenderer;
marked.Lexer = Lexer;
marked.lexer = Lexer.lex;
marked.Tokenizer = Tokenizer;
marked.Slugger = Slugger;
marked.Hooks = Hooks;
marked.parse = marked;
var options = marked.options;
var setOptions = marked.setOptions;
var use = marked.use;
var walkTokens = marked.walkTokens;
var parseInline = marked.parseInline;
var parser = Parser.parse;
var lexer = Lexer.lex;

// index.tsx
var MODEL_NAME = "gemini-2.5-flash-preview-04-17";
var LIVE_WAVEFORM_SAMPLES = 256;
var App = class {
  constructor() {
    this.liveWaveformContext = null;
    this.currentDeleteNoteId = null;
    this.pendingAudioFile = null;
    this.pendingAudioUploadEventTarget = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.audioContext = null;
    this.analyserNode = null;
    this.microphoneSource = null;
    this.waveformDataArray = null;
    this.waveformAnimationId = null;
    this.liveRecordingStartTime = 0;
    this.liveRecordingTimerIntervalId = null;
    this.currentNote = null;
    this.notes = [];
    this.currentPolishMode = "standard";
    this.currentCustomPolishPrompt = "";
    this.autosaveTimeout = null;
    this.statusClearTimeout = null;
    this.promptTemplates = [
      { name: "Seleccionar plantilla...", value: "" },
      { name: "Resumir para email", value: "Resume el siguiente texto para incluirlo en un email conciso. Enf\xF3cate en los puntos principales y acciones requeridas. Formatea en markdown. Aseg\xFArate de que la respuesta est\xE9 en espa\xF1ol." },
      { name: "Extraer puntos clave (Vi\xF1etas)", value: "Extrae los puntos clave m\xE1s importantes del siguiente texto en formato de lista de vi\xF1etas (markdown). Aseg\xFArate de que la respuesta est\xE9 en espa\xF1ol." },
      { name: "Corregir gram\xE1tica y estilo", value: "Revisa y corrige la gram\xE1tica, ortograf\xEDa y estilo del siguiente texto para que sea claro y profesional. Mant\xE9n el formato original si es posible. Formatea en markdown. Aseg\xFArate de que la respuesta est\xE9 en espa\xF1ol." },
      { name: "Traducir a Ingl\xE9s", value: "Translate the following text to English. Preserve original formatting if possible. Respond only with the translation." },
      { name: "Traducir a Espa\xF1ol", value: "Traduce el siguiente texto al espa\xF1ol. Conserva el formato original si es posible. Responde \xFAnicamente con la traducci\xF3n." },
      { name: "Explicar como si tuviera 5 a\xF1os", value: "Explain the following concept or text as if I were 5 years old. Use simple words and short sentences. Format in markdown. Ensure the response is in Spanish." }
    ];
    if (false) {
      this.showFatalError("La variable de entorno API_KEY no est\xE1 configurada.");
      throw new Error("La variable de entorno API_KEY no est\xE1 configurada.");
    }
    this.genAI = new GoogleGenAI({ apiKey: "AIzaSyAPlhqR6u8ZXpb9-PxSHvWGIR1ZqZdIats" });
    this.markdownParser = marked;
    this.editorTitle = document.querySelector(".editor-title");
    this.polishedNote = document.getElementById("polishedNote");
    this.rawTranscription = document.getElementById("rawTranscription");
    this.recordButton = document.getElementById("recordButton");
    this.newButton = document.getElementById("newButton");
    this.polishTextButton = document.getElementById("polishTextButton");
    this.retryPolishButton = document.getElementById("retryPolishButton");
    this.themeToggleButton = document.getElementById("themeToggleButton");
    this.recordingStatus = document.getElementById("recordingStatus");
    this.liveRecordingTitle = document.getElementById("liveRecordingTitle");
    this.liveWaveformCanvas = document.getElementById("liveWaveformCanvas");
    this.liveRecordingTimerDisplay = document.getElementById("liveRecordingTimerDisplay");
    this.recordingInterface = document.querySelector(".recording-interface");
    this.mainContent = document.querySelector(".main-content");
    this.historyButton = document.getElementById("historyButton");
    this.historyPanel = document.getElementById("historyPanel");
    this.closeHistoryPanelButton = document.getElementById("closeHistoryPanelButton");
    this.historyList = document.getElementById("historyList");
    this.historySearchInput = document.getElementById("historySearchInput");
    this.exportHistoryButton = document.getElementById("exportHistoryButton");
    this.importHistoryButton = document.getElementById("importHistoryButton");
    this.importHistoryInput = document.getElementById("importHistoryInput");
    this.audioUploadInput = document.getElementById("audioUploadInput");
    this.audioUploadButton = document.getElementById("audioUploadButton");
    this.polishOptionsModal = document.getElementById("polishOptionsModal");
    this.closePolishOptionsModalButton = document.getElementById("closePolishOptionsModalButton");
    this.polishModeSelect = document.getElementById("polishModeSelect");
    this.customPromptContainer = document.getElementById("customPromptContainer");
    this.customPromptTemplateContainer = document.getElementById("customPromptTemplateContainer");
    this.customPromptTemplateSelect = document.getElementById("customPromptTemplateSelect");
    this.customPromptTextarea = document.getElementById("customPromptTextarea");
    this.applyPolishOptionsButton = document.getElementById("applyPolishOptionsButton");
    this.currentNotePolishModeSelect = document.getElementById("currentNotePolishModeSelect");
    this.topCopyPolishedButton = document.getElementById("topCopyPolishedButton");
    this.copyPolishedButton = document.getElementById("copyPolishedButton");
    this.exportPolishedTxtButton = document.getElementById("exportPolishedTxtButton");
    this.exportPolishedMdButton = document.getElementById("exportPolishedMdButton");
    this.copyRawButton = document.getElementById("copyRawButton");
    this.exportRawTxtButton = document.getElementById("exportRawTxtButton");
    this.exportRawMdButton = document.getElementById("exportRawMdButton");
    this.polishedCounters = document.getElementById("polishedCounters");
    this.rawCounters = document.getElementById("rawCounters");
    this.confirmDeleteModal = document.getElementById("confirmDeleteModal");
    this.confirmDeleteMessageElement = document.getElementById("confirmDeleteModalMessage");
    this.confirmDeleteConfirmButton = document.getElementById("confirmDeleteConfirmButton");
    this.confirmDeleteCancelButton = document.getElementById("confirmDeleteCancelButton");
    this.confirmAudioUploadModal = document.getElementById("confirmAudioUploadModal");
    this.confirmAudioUploadMessageElement = document.getElementById("confirmAudioUploadModalMessage");
    this.confirmAudioUploadOverwriteButton = document.getElementById("confirmAudioUploadOverwriteButton");
    this.confirmAudioUploadCreateNewButton = document.getElementById("confirmAudioUploadCreateNewButton");
    this.confirmAudioUploadCancelButton = document.getElementById("confirmAudioUploadCancelButton");
    this.polishedNotePlaceholder = this.polishedNote.getAttribute("placeholder") || "Tus notas pulidas aparecer\xE1n aqu\xED...";
    this.rawTranscriptionPlaceholder = this.rawTranscription.getAttribute("placeholder") || "La transcripci\xF3n en bruto aparecer\xE1 aqu\xED...";
    this.editorTitlePlaceholder = this.editorTitle.getAttribute("placeholder") || "Nota sin T\xEDtulo";
    if (this.liveWaveformCanvas) {
      this.liveWaveformContext = this.liveWaveformCanvas.getContext("2d");
    }
    this.populatePromptTemplates();
    this.loadNotesFromStorage();
    this.initEventListeners();
    this.initConfirmDeleteModalListeners();
    this.initConfirmAudioUploadModalListeners();
    this.initializePlaceholders();
    this.checkInitialTheme();
    this.loadInitialNote();
    this.updateAllButtonStates();
    this.updateAllWordCharCounts();
  }
  showFatalError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.style.position = "fixed";
    errorDiv.style.top = "0";
    errorDiv.style.left = "0";
    errorDiv.style.width = "100%";
    errorDiv.style.padding = "20px";
    errorDiv.style.backgroundColor = "red";
    errorDiv.style.color = "white";
    errorDiv.style.textAlign = "center";
    errorDiv.style.fontSize = "20px";
    errorDiv.style.zIndex = "9999";
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    const appContainer = document.querySelector(".app-container");
    if (appContainer) appContainer.style.display = "none";
  }
  initializePlaceholders() {
    this.setupPlaceholder(this.editorTitle, this.editorTitlePlaceholder);
    this.setupPlaceholder(this.polishedNote, this.polishedNotePlaceholder);
    this.setupPlaceholder(this.rawTranscription, this.rawTranscriptionPlaceholder);
  }
  setupPlaceholder(element, placeholderText) {
    if (!element.textContent?.trim() && placeholderText) {
      element.textContent = placeholderText;
      element.classList.add("placeholder-active");
    }
    element.addEventListener("focus", () => {
      if (element.classList.contains("placeholder-active")) {
        element.textContent = "";
        element.classList.remove("placeholder-active");
      }
    });
    element.addEventListener("blur", () => {
      if (!element.textContent?.trim()) {
        element.textContent = placeholderText;
        element.classList.add("placeholder-active");
      }
      this.handleAutoSave();
    });
  }
  clearPlaceholder(element) {
    const placeholderText = element.getAttribute("placeholder");
    if (element.classList.contains("placeholder-active") && placeholderText && element.textContent === placeholderText) {
      element.textContent = "";
    }
    element.classList.remove("placeholder-active");
  }
  restorePlaceholder(element, placeholderText) {
    const isEmpty = element.isContentEditable ? !element.innerHTML?.trim() || element.innerHTML === "<br>" || element.innerHTML === "<p><br></p>" : !element.textContent?.trim();
    if (isEmpty) {
      element.textContent = placeholderText;
      element.classList.add("placeholder-active");
    } else if (!element.classList.contains("placeholder-active") && element.textContent === placeholderText) {
      element.classList.add("placeholder-active");
    }
  }
  populatePromptTemplates() {
    this.promptTemplates.forEach((template) => {
      const option = document.createElement("option");
      option.value = template.value;
      option.textContent = template.name;
      this.customPromptTemplateSelect.appendChild(option);
    });
  }
  initEventListeners() {
    this.recordButton.addEventListener("click", () => this.toggleRecording());
    this.newButton.addEventListener("click", () => this.createNewNoteUIAction());
    this.polishTextButton.addEventListener("click", () => this.handleManualPolishWithCurrentSettings());
    this.retryPolishButton.addEventListener("click", () => this.handleRetryPolish());
    this.themeToggleButton.addEventListener("click", () => this.toggleTheme());
    this.historyButton.addEventListener("click", () => this.toggleHistoryPanel());
    this.closeHistoryPanelButton.addEventListener("click", () => this.toggleHistoryPanel(false));
    this.historySearchInput.addEventListener("input", () => this.renderHistoryList());
    this.exportHistoryButton.addEventListener("click", () => this.exportHistory());
    this.importHistoryButton.addEventListener("click", () => this.importHistoryInput.click());
    this.importHistoryInput.addEventListener("change", (event) => this.importHistory(event));
    this.audioUploadButton.addEventListener("click", () => this.audioUploadInput.click());
    this.audioUploadInput.addEventListener("change", (event) => this.handleAudioFileUpload(event));
    this.closePolishOptionsModalButton.addEventListener("click", () => this.togglePolishOptionsModal(false));
    this.polishModeSelect.addEventListener("change", () => this.handlePolishModeChangeInModal());
    this.customPromptTemplateSelect.addEventListener("change", () => this.handlePromptTemplateChange());
    this.applyPolishOptionsButton.addEventListener("click", () => this.applyAndPolishFromModal());
    this.currentNotePolishModeSelect.addEventListener("change", () => this.handleCurrentNotePolishModeChange());
    this.topCopyPolishedButton.addEventListener("click", () => this.copyContentToClipboard(this.polishedNote, "Nota Pulida"));
    this.copyPolishedButton.addEventListener("click", () => this.copyContentToClipboard(this.polishedNote, "Nota Pulida"));
    this.exportPolishedTxtButton.addEventListener("click", () => this.exportNoteContent("polished", "txt"));
    this.exportPolishedMdButton.addEventListener("click", () => this.exportNoteContent("polished", "md"));
    this.copyRawButton.addEventListener("click", () => this.copyContentToClipboard(this.rawTranscription, "Borrador"));
    this.exportRawTxtButton.addEventListener("click", () => this.exportNoteContent("raw", "txt"));
    this.exportRawMdButton.addEventListener("click", () => this.exportNoteContent("raw", "md"));
    this.editorTitle.addEventListener("input", () => this.handleContentChange(this.editorTitle, "title"));
    this.polishedNote.addEventListener("input", () => {
      this.handleContentChange(this.polishedNote, "polished");
      requestAnimationFrame(() => {
        this.updateWordCharCount("polished");
        this.updateTopCopyButtonVisibility();
      });
    });
    this.rawTranscription.addEventListener("input", () => {
      this.handleContentChange(this.rawTranscription, "raw");
      requestAnimationFrame(() => {
        this.updateAllButtonStates();
        this.updateWordCharCount("raw");
      });
    });
    this.editorTitle.addEventListener("blur", () => this.updateDocumentTitle());
  }
  initConfirmDeleteModalListeners() {
    this.confirmDeleteCancelButton.addEventListener("click", () => this.hideConfirmDeleteModal());
    this.confirmDeleteConfirmButton.addEventListener("click", () => {
      if (this.currentDeleteNoteId) {
        this.deleteNoteById(this.currentDeleteNoteId);
      }
      this.hideConfirmDeleteModal();
    });
  }
  initConfirmAudioUploadModalListeners() {
    this.confirmAudioUploadOverwriteButton.addEventListener("click", () => {
      this.hideConfirmAudioUploadModal();
      if (this.pendingAudioFile && this.pendingAudioUploadEventTarget) {
        this.proceedWithAudioProcessing(this.pendingAudioFile, this.pendingAudioUploadEventTarget);
      }
    });
    this.confirmAudioUploadCreateNewButton.addEventListener("click", () => {
      this.hideConfirmAudioUploadModal();
      if (this.pendingAudioFile && this.pendingAudioUploadEventTarget) {
        this.createNewNoteUIAction();
        this.proceedWithAudioProcessing(this.pendingAudioFile, this.pendingAudioUploadEventTarget);
      }
    });
    this.confirmAudioUploadCancelButton.addEventListener("click", () => {
      this.hideConfirmAudioUploadModal();
      this.clearPendingAudioUpload();
    });
  }
  handleContentChange(element, fieldType) {
    if (element.classList.contains("placeholder-active")) {
      element.classList.remove("placeholder-active");
    }
    if (this.autosaveTimeout) clearTimeout(this.autosaveTimeout);
    this.autosaveTimeout = window.setTimeout(() => {
      this.updateCurrentNoteFromUI();
      this.saveCurrentNote(false);
    }, 750);
  }
  handleAutoSave() {
    if (this.autosaveTimeout) clearTimeout(this.autosaveTimeout);
    this.updateCurrentNoteFromUI();
    this.saveCurrentNote(false);
  }
  loadNotesFromStorage() {
    const storedNotes = localStorage.getItem("dictationAppNotes");
    if (storedNotes) {
      try {
        this.notes = JSON.parse(storedNotes);
        this.notes = this.notes.filter((note) => note && typeof note.id === "string" && typeof note.title === "string");
        this.notes.sort((a, b) => b.lastModified - a.lastModified);
      } catch (error) {
        console.error("Error al parsear notas del localStorage:", error);
        this.notes = [];
        localStorage.removeItem("dictationAppNotes");
      }
    } else {
      this.notes = [];
    }
    this.renderHistoryList();
  }
  saveNotesToStorage() {
    try {
      localStorage.setItem("dictationAppNotes", JSON.stringify(this.notes));
    } catch (error) {
      console.error("Error al guardar notas en localStorage:", error);
      this.updateStatus("Error al guardar notas. Puede que el almacenamiento est\xE9 lleno.", "error", 5e3);
    }
  }
  generateUUID() {
    return crypto.randomUUID();
  }
  createNewNoteObject() {
    const timestamp = Date.now();
    return {
      id: this.generateUUID(),
      title: "",
      rawText: "",
      polishedHTML: "",
      polishedMarkdown: "",
      polishModeUsed: "standard",
      customPromptUsed: void 0,
      createdAt: timestamp,
      lastModified: timestamp
    };
  }
  loadInitialNote() {
    if (this.notes.length > 0) {
      this.loadNoteIntoUI(this.notes[0].id, true);
    } else {
      this.currentNote = this.createNewNoteObject();
      this.notes.push(this.currentNote);
      this.saveNotesToStorage();
      this.renderHistoryList();
      this.updateUIFromCurrentNote();
    }
  }
  createNewNoteUIAction() {
    if (this.currentNote) {
      this.updateCurrentNoteFromUI();
      this.saveCurrentNote(false);
    }
    this.currentNote = this.createNewNoteObject();
    this.notes.unshift(this.currentNote);
    this.saveNotesToStorage();
    this.renderHistoryList();
    this.updateUIFromCurrentNote();
    this.updateStatus("Nueva nota creada.", "success", 2e3);
    const polishedTabButton = document.querySelector('.tab-button[data-tab="note"]');
    if (polishedTabButton && typeof window.setActiveTab === "function") {
      window.setActiveTab(polishedTabButton, true);
    }
    this.editorTitle.focus();
  }
  updateCurrentNoteFromUI() {
    if (!this.currentNote) return;
    this.currentNote.title = this.editorTitle.classList.contains("placeholder-active") ? "" : this.editorTitle.textContent || "";
    this.currentNote.rawText = this.rawTranscription.classList.contains("placeholder-active") ? "" : this.rawTranscription.innerHTML;
    this.currentNote.polishedHTML = this.polishedNote.classList.contains("placeholder-active") ? "" : this.polishedNote.innerHTML;
    const selectedModeInHeader = this.currentNotePolishModeSelect.value;
    this.currentNote.polishModeUsed = selectedModeInHeader;
    this.currentPolishMode = selectedModeInHeader;
    if (selectedModeInHeader === "custom") {
      this.currentNote.customPromptUsed = this.currentCustomPolishPrompt;
    } else {
      delete this.currentNote.customPromptUsed;
    }
    this.currentNote.lastModified = Date.now();
  }
  saveCurrentNote(showStatus = true) {
    if (!this.currentNote) return;
    const noteIndex = this.notes.findIndex((note) => note.id === this.currentNote.id);
    if (noteIndex > -1) {
      this.notes[noteIndex] = { ...this.currentNote };
    } else {
      this.notes.unshift({ ...this.currentNote });
    }
    this.notes.sort((a, b) => b.lastModified - a.lastModified);
    this.saveNotesToStorage();
    this.renderHistoryList();
    if (showStatus) {
      this.updateStatus("Nota guardada \u2713", "success", 1500);
    }
  }
  loadNoteIntoUI(noteId, isInitialLoad = false) {
    const noteToLoad = this.notes.find((note) => note.id === noteId);
    if (noteToLoad) {
      if (this.currentNote && this.currentNote.id !== noteId && !isInitialLoad) {
        this.updateCurrentNoteFromUI();
        this.saveCurrentNote(false);
      }
      this.currentNote = JSON.parse(JSON.stringify(noteToLoad));
      this.updateUIFromCurrentNote();
      if (!isInitialLoad) {
        this.updateStatus(`Nota "${this.currentNote.title || "Sin T\xEDtulo"}" cargada.`, "success", 2e3);
      }
      if (this.historyPanel.classList.contains("active")) {
        this.toggleHistoryPanel(false);
      }
    } else {
      console.warn(`No se encontr\xF3 la nota con ID: ${noteId}`);
      if (!isInitialLoad) this.loadInitialNote();
    }
  }
  updateUIFromCurrentNote() {
    if (!this.currentNote) {
      this.editorTitle.innerHTML = "";
      this.restorePlaceholder(this.editorTitle, this.editorTitlePlaceholder);
      this.rawTranscription.innerHTML = "";
      this.restorePlaceholder(this.rawTranscription, this.rawTranscriptionPlaceholder);
      this.polishedNote.innerHTML = "";
      this.restorePlaceholder(this.polishedNote, this.polishedNotePlaceholder);
      this.currentNotePolishModeSelect.value = "standard";
      this.currentPolishMode = "standard";
      this.currentCustomPolishPrompt = "";
      this.updateDocumentTitle();
      this.updateAllButtonStates();
      this.updateAllWordCharCounts();
      this.updateTopCopyButtonVisibility();
      return;
    }
    if (this.currentNote.title && this.currentNote.title.trim() !== "" && this.currentNote.title !== this.editorTitlePlaceholder) {
      this.editorTitle.textContent = this.currentNote.title;
      this.clearPlaceholder(this.editorTitle);
    } else {
      this.editorTitle.innerHTML = "";
      this.restorePlaceholder(this.editorTitle, this.editorTitlePlaceholder);
    }
    if (this.currentNote.rawText && this.getPlainText(this.currentNote.rawText).trim() !== "") {
      this.rawTranscription.innerHTML = this.currentNote.rawText;
      this.clearPlaceholder(this.rawTranscription);
    } else {
      this.rawTranscription.innerHTML = "";
      this.restorePlaceholder(this.rawTranscription, this.rawTranscriptionPlaceholder);
    }
    if (this.currentNote.polishedHTML && this.getPlainText(this.currentNote.polishedHTML).trim() !== "") {
      this.polishedNote.innerHTML = this.currentNote.polishedHTML;
      this.clearPlaceholder(this.polishedNote);
    } else {
      this.polishedNote.innerHTML = "";
      this.restorePlaceholder(this.polishedNote, this.polishedNotePlaceholder);
    }
    this.currentNotePolishModeSelect.value = this.currentNote.polishModeUsed || "standard";
    this.currentPolishMode = this.currentNote.polishModeUsed || "standard";
    this.currentCustomPolishPrompt = this.currentNote.customPromptUsed || "";
    this.updateDocumentTitle();
    this.updateAllButtonStates();
    this.updateAllWordCharCounts();
    this.updateTopCopyButtonVisibility();
    this.polishModeSelect.value = this.currentPolishMode;
    this.customPromptTextarea.value = this.currentCustomPolishPrompt;
    this.customPromptTemplateSelect.value = "";
    this.handlePolishModeChangeInModal();
  }
  updateDocumentTitle() {
    if (this.currentNote && this.currentNote.title && !this.editorTitle.classList.contains("placeholder-active")) {
      document.title = `App de Dictado - ${this.currentNote.title}`;
    } else {
      document.title = "App de Dictado Avanzada";
    }
  }
  toggleHistoryPanel(forceOpen) {
    const isActive = this.historyPanel.classList.contains("active");
    let openPanel;
    if (typeof forceOpen === "boolean") {
      openPanel = forceOpen;
    } else {
      openPanel = !isActive;
    }
    if (openPanel) {
      this.historyPanel.classList.add("active");
      this.mainContent.classList.add("history-panel-active");
      this.historyButton.setAttribute("aria-expanded", "true");
      this.historySearchInput.focus();
    } else {
      this.historyPanel.classList.remove("active");
      this.mainContent.classList.remove("history-panel-active");
      this.historyButton.setAttribute("aria-expanded", "false");
    }
  }
  renderHistoryList() {
    this.historyList.innerHTML = "";
    const searchTerm = this.historySearchInput.value.toLowerCase().trim();
    const filteredNotes = this.notes.filter(
      (note) => (note.title || "Nota sin T\xEDtulo").toLowerCase().includes(searchTerm) || note.rawText && this.getPlainText(note.rawText).toLowerCase().includes(searchTerm) || note.polishedHTML && this.getPlainText(note.polishedHTML).toLowerCase().includes(searchTerm)
    );
    if (filteredNotes.length === 0) {
      const li = document.createElement("li");
      li.textContent = searchTerm ? "No hay notas que coincidan con tu b\xFAsqueda." : "No hay notas guardadas.";
      li.classList.add("history-empty-message");
      this.historyList.appendChild(li);
      return;
    }
    filteredNotes.forEach((note) => {
      const li = document.createElement("li");
      li.classList.add("history-item");
      li.dataset.noteId = note.id;
      li.setAttribute("role", "button");
      li.setAttribute("tabindex", "0");
      li.setAttribute("aria-label", `Cargar nota: ${note.title || "Nota sin T\xEDtulo"}`);
      const mainDiv = document.createElement("div");
      mainDiv.classList.add("history-item-main");
      const titleSpan = document.createElement("span");
      titleSpan.classList.add("history-item-title");
      titleSpan.textContent = note.title || "Nota sin T\xEDtulo";
      const dateSpan = document.createElement("span");
      dateSpan.classList.add("history-item-date");
      dateSpan.textContent = new Date(note.lastModified).toLocaleString("es-ES", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
      mainDiv.appendChild(titleSpan);
      mainDiv.appendChild(dateSpan);
      const controlsDiv = document.createElement("div");
      controlsDiv.classList.add("history-item-controls");
      const editButton = document.createElement("button");
      editButton.classList.add("history-item-button", "edit-button");
      editButton.innerHTML = '<i class="fas fa-pencil-alt"></i>';
      editButton.title = "Editar t\xEDtulo";
      editButton.setAttribute("aria-label", `Editar t\xEDtulo de la nota: ${note.title || "Nota sin T\xEDtulo"}`);
      editButton.onclick = (e) => {
        e.stopPropagation();
        this.handleEditHistoryItemTitle(note.id, titleSpan, mainDiv);
      };
      const deleteButton = document.createElement("button");
      deleteButton.classList.add("history-item-button", "delete-button");
      deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
      deleteButton.title = "Eliminar nota";
      deleteButton.setAttribute("aria-label", `Eliminar nota: ${note.title || "Nota sin T\xEDtulo"}`);
      deleteButton.onclick = (e) => {
        e.stopPropagation();
        this.confirmDeleteNote(note.id);
      };
      controlsDiv.appendChild(editButton);
      controlsDiv.appendChild(deleteButton);
      li.appendChild(mainDiv);
      li.appendChild(controlsDiv);
      li.onclick = () => this.loadNoteIntoUI(note.id);
      li.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") this.loadNoteIntoUI(note.id);
      };
      this.historyList.appendChild(li);
    });
  }
  handleEditHistoryItemTitle(noteId, titleElement, mainDiv) {
    const currentTitle = titleElement.textContent || "";
    const input = document.createElement("input");
    input.type = "text";
    input.value = currentTitle;
    input.classList.add("history-item-title-input");
    input.setAttribute("aria-label", "Nuevo t\xEDtulo de la nota");
    titleElement.style.display = "none";
    mainDiv.insertBefore(input, titleElement.nextSibling);
    input.focus();
    input.select();
    const saveTitle = () => {
      const newTitle = input.value.trim();
      this.handleSaveHistoryItemTitle(noteId, newTitle);
      titleElement.textContent = newTitle || "Nota sin T\xEDtulo";
      titleElement.style.display = "";
      if (input.parentNode) input.parentNode.removeChild(input);
    };
    input.onblur = saveTitle;
    input.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveTitle();
      } else if (e.key === "Escape") {
        titleElement.style.display = "";
        if (input.parentNode) input.parentNode.removeChild(input);
      }
    };
  }
  handleSaveHistoryItemTitle(noteId, newTitle) {
    const noteIndex = this.notes.findIndex((n) => n.id === noteId);
    if (noteIndex > -1) {
      this.notes[noteIndex].title = newTitle;
      this.notes[noteIndex].lastModified = Date.now();
      if (this.currentNote && this.currentNote.id === noteId) {
        this.currentNote.title = newTitle;
        this.currentNote.lastModified = this.notes[noteIndex].lastModified;
        this.updateDocumentTitle();
        this.editorTitle.textContent = newTitle || "";
        if (newTitle && newTitle !== this.editorTitlePlaceholder) this.clearPlaceholder(this.editorTitle);
        else this.restorePlaceholder(this.editorTitle, this.editorTitlePlaceholder);
      }
      this.saveNotesToStorage();
      this.renderHistoryList();
      this.updateStatus("T\xEDtulo de la nota actualizado.", "success", 1500);
    }
  }
  showConfirmDeleteModal(noteId, noteTitle) {
    this.currentDeleteNoteId = noteId;
    this.confirmDeleteMessageElement.textContent = `\xBFEst\xE1s seguro de que quieres eliminar la nota "${noteTitle || "Sin T\xEDtulo"}"? Esta acci\xF3n no se puede deshacer.`;
    this.confirmDeleteModal.style.display = "flex";
    this.confirmDeleteModal.setAttribute("aria-hidden", "false");
    this.confirmDeleteConfirmButton.focus();
  }
  hideConfirmDeleteModal() {
    this.confirmDeleteModal.style.display = "none";
    this.confirmDeleteModal.setAttribute("aria-hidden", "true");
    this.currentDeleteNoteId = null;
  }
  confirmDeleteNote(noteId) {
    const noteToDelete = this.notes.find((n) => n.id === noteId);
    if (!noteToDelete) return;
    this.showConfirmDeleteModal(noteId, noteToDelete.title);
  }
  deleteNoteById(noteId) {
    const noteWasCurrent = this.currentNote && this.currentNote.id === noteId;
    this.notes = this.notes.filter((note) => note.id !== noteId);
    this.saveNotesToStorage();
    if (noteWasCurrent) {
      this.loadInitialNote();
    }
    this.renderHistoryList();
    this.updateStatus("Nota eliminada.", "success", 2e3);
  }
  exportHistory() {
    if (this.notes.length === 0) {
      this.updateStatus("No hay notas para exportar.", "active", 2e3);
      return;
    }
    try {
      const jsonData = JSON.stringify(this.notes, null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      a.href = url;
      a.download = `dictado_app_historial_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.updateStatus("Historial exportado exitosamente.", "success", 2500);
    } catch (error) {
      console.error("Error al exportar historial:", error);
      this.updateStatus("Error al exportar el historial.", "error", 4e3);
    }
  }
  importHistory(event) {
    const input = event.target;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedNotes = JSON.parse(e.target?.result);
        if (!Array.isArray(importedNotes)) {
          throw new Error("El archivo JSON no contiene un array de notas.");
        }
        const validImportedNotes = importedNotes.filter(
          (note) => note && typeof note.id === "string" && typeof note.title === "string" && typeof note.createdAt === "number" && typeof note.lastModified === "number"
        );
        if (validImportedNotes.length === 0 && importedNotes.length > 0) {
          throw new Error("Ninguna nota v\xE1lida encontrada en el archivo. Verifica el formato.");
        }
        const newNotesMap = /* @__PURE__ */ new Map();
        this.notes.forEach((note) => newNotesMap.set(note.id, note));
        validImportedNotes.forEach((note) => newNotesMap.set(note.id, note));
        this.notes = Array.from(newNotesMap.values());
        this.notes.sort((a, b) => b.lastModified - a.lastModified);
        this.saveNotesToStorage();
        this.renderHistoryList();
        if (this.notes.length > 0 && (!this.currentNote || !this.notes.find((n) => n.id === this.currentNote.id))) {
          this.loadInitialNote();
        } else if (this.currentNote) {
          const updatedCurrentNote = this.notes.find((n) => n.id === this.currentNote.id);
          if (updatedCurrentNote) {
            this.currentNote = JSON.parse(JSON.stringify(updatedCurrentNote));
            this.updateUIFromCurrentNote();
          } else {
            this.loadInitialNote();
          }
        }
        this.updateStatus(`Historial importado. ${validImportedNotes.length} notas cargadas/actualizadas.`, "success", 3e3);
      } catch (error) {
        console.error("Error al importar historial:", error);
        this.updateStatus(`Error al importar: ${error.message}`, "error", 5e3);
      } finally {
        input.value = "";
      }
    };
    reader.onerror = () => {
      this.updateStatus("Error al leer el archivo.", "error", 3e3);
      input.value = "";
    };
    reader.readAsText(file);
  }
  isCurrentNoteEmpty() {
    if (!this.currentNote) return true;
    const titleEmpty = this.currentNote.title.trim() === "" || this.editorTitle.classList.contains("placeholder-active");
    const rawEmpty = this.getPlainText(this.currentNote.rawText).trim() === "" || this.rawTranscription.classList.contains("placeholder-active");
    const polishedEmpty = this.getPlainText(this.currentNote.polishedHTML).trim() === "" || this.polishedNote.classList.contains("placeholder-active");
    return titleEmpty && rawEmpty && polishedEmpty;
  }
  async handleAudioFileUpload(event) {
    const input = event.target;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    if (!this.isCurrentNoteEmpty()) {
      this.pendingAudioFile = file;
      this.pendingAudioUploadEventTarget = input;
      this.showConfirmAudioUploadModal();
      return;
    }
    this.proceedWithAudioProcessing(file, input);
  }
  async proceedWithAudioProcessing(file, inputTarget) {
    this.updateStatus(`Cargando archivo: ${file.name}...`, "active");
    try {
      const reader = new FileReader();
      const readResult = new Promise((resolve, reject) => {
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("FileReader no devolvi\xF3 una cadena."));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const base64data = await readResult;
      const base64Audio = base64data.split(",")[1];
      if (!base64Audio) {
        throw new Error("Error al extraer datos de audio base64 del archivo.");
      }
      this.updateStatus("Archivo cargado. Transcribiendo...", "active");
      const rawText = await this.getTranscription(base64Audio, file.type);
      if (!this.currentNote) {
        this.createNewNoteUIAction();
      }
      if (this.currentNote) {
        this.currentNote.rawText = rawText;
        this.currentNote.polishedHTML = "";
        this.currentNote.polishedMarkdown = "";
        if (!this.currentNote.title || this.currentNote.title === this.editorTitlePlaceholder) {
          this.currentNote.title = `Nota de ${file.name.split(".")[0]}`;
        }
        this.currentNote.lastModified = Date.now();
        this.saveCurrentNote(true);
        this.updateUIFromCurrentNote();
        this.updateStatus("Transcripci\xF3n del archivo completada.", "success", 3e3);
        const rawTabButton = document.querySelector('.tab-button[data-tab="raw"]');
        if (rawTabButton && typeof window.setActiveTab === "function") {
          window.setActiveTab(rawTabButton);
        }
      }
    } catch (error) {
      console.error("Error procesando archivo de audio:", error);
      this.updateStatus(`Error al cargar archivo: ${error.message}.`, "error", 5e3);
    } finally {
      this.clearPendingAudioUpload();
    }
  }
  showConfirmAudioUploadModal() {
    const currentTitle = this.currentNote?.title || "Sin T\xEDtulo";
    this.confirmAudioUploadMessageElement.textContent = `La nota actual ("${currentTitle}") ya tiene contenido. \xBFQu\xE9 deseas hacer con el archivo de audio subido?`;
    this.confirmAudioUploadModal.style.display = "flex";
    this.confirmAudioUploadModal.setAttribute("aria-hidden", "false");
    this.confirmAudioUploadOverwriteButton.focus();
  }
  hideConfirmAudioUploadModal() {
    this.confirmAudioUploadModal.style.display = "none";
    this.confirmAudioUploadModal.setAttribute("aria-hidden", "true");
  }
  clearPendingAudioUpload() {
    if (this.pendingAudioUploadEventTarget) {
      this.pendingAudioUploadEventTarget.value = "";
    }
    this.pendingAudioFile = null;
    this.pendingAudioUploadEventTarget = null;
  }
  togglePolishOptionsModal(show) {
    this.polishOptionsModal.style.display = show ? "flex" : "none";
    if (show) {
      this.polishOptionsModal.setAttribute("aria-hidden", "false");
      const modeToShow = this.currentNote ? this.currentNote.polishModeUsed : this.currentPolishMode;
      const promptToShow = this.currentNote ? this.currentNote.customPromptUsed || this.currentCustomPolishPrompt : this.currentCustomPolishPrompt;
      this.polishModeSelect.value = modeToShow || "standard";
      this.customPromptTextarea.value = promptToShow || "";
      this.customPromptTemplateSelect.value = "";
      this.handlePolishModeChangeInModal();
      this.polishModeSelect.focus();
    } else {
      this.polishOptionsModal.setAttribute("aria-hidden", "true");
    }
  }
  handlePolishModeChangeInModal() {
    const selectedModeInModal = this.polishModeSelect.value;
    const isCustom = selectedModeInModal === "custom";
    this.customPromptContainer.style.display = isCustom ? "block" : "none";
    this.customPromptTemplateContainer.style.display = isCustom ? "block" : "none";
    this.customPromptTextarea.setAttribute("aria-hidden", isCustom ? "false" : "true");
    this.customPromptTemplateSelect.setAttribute("aria-hidden", isCustom ? "false" : "true");
  }
  handleCurrentNotePolishModeChange() {
    if (!this.currentNote) return;
    const newMode = this.currentNotePolishModeSelect.value;
    this.currentPolishMode = newMode;
    if (newMode === "custom") {
      this.currentCustomPolishPrompt = this.currentNote.customPromptUsed || "";
      this.polishModeSelect.value = "custom";
      this.customPromptTextarea.value = this.currentCustomPolishPrompt;
      this.handlePolishModeChangeInModal();
      this.togglePolishOptionsModal(true);
    } else {
      this.currentCustomPolishPrompt = "";
    }
    this.updateCurrentNoteFromUI();
    this.saveCurrentNote(false);
    this.updateAllButtonStates();
  }
  handlePromptTemplateChange() {
    const selectedValue = this.customPromptTemplateSelect.value;
    if (selectedValue) {
      this.customPromptTextarea.value = selectedValue;
      this.customPromptTextarea.focus();
      if (this.customPromptTextarea.classList.contains("placeholder-active")) {
        this.customPromptTextarea.classList.remove("placeholder-active");
      }
    }
  }
  handleRetryPolish() {
    if (this.isRawTranscriptionEmpty()) {
      this.updateStatus("Nada que pulir. Escribe o graba algo en 'Borrador'.", "active", 3e3);
      return;
    }
    const modeToPreload = this.currentNote?.polishModeUsed || this.currentPolishMode || "standard";
    const customPromptToPreload = (modeToPreload === "custom" ? this.currentNote?.customPromptUsed || this.currentCustomPolishPrompt : "") || "";
    this.polishModeSelect.value = modeToPreload;
    this.customPromptTextarea.value = customPromptToPreload;
    this.handlePolishModeChangeInModal();
    this.togglePolishOptionsModal(true);
  }
  applyAndPolishFromModal() {
    this.currentPolishMode = this.polishModeSelect.value;
    if (this.currentPolishMode === "custom") {
      this.currentCustomPolishPrompt = this.customPromptTextarea.value.trim();
      if (!this.currentCustomPolishPrompt) {
        this.updateStatus("El prompt personalizado no puede estar vac\xEDo para el modo personalizado.", "error", 3e3);
        return;
      }
    } else {
      this.currentCustomPolishPrompt = "";
    }
    this.togglePolishOptionsModal(false);
    this.handleManualPolishWithCurrentSettings();
  }
  getPlainText(htmlContent) {
    if (!htmlContent) return "";
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent.replace(/<br\s*\/?>/gi, "\n");
    return tempDiv.textContent || tempDiv.innerText || "";
  }
  copyContentToClipboard(element, type) {
    let textToCopy = this.getPlainText(element.innerHTML);
    if (element.classList.contains("placeholder-active") || !textToCopy.trim()) {
      this.updateStatus(`${type} est\xE1 vac\xEDo. Nada que copiar.`, "active", 2e3);
      return;
    }
    navigator.clipboard.writeText(textToCopy).then(() => {
      this.updateStatus(`${type} copiado al portapapeles.`, "success", 2e3);
    }).catch((err) => {
      console.error(`Error al copiar ${type}:`, err);
      this.updateStatus(`Error al copiar ${type}. Intenta manually.`, "error", 4e3);
    });
  }
  exportNoteContent(contentSource, format) {
    if (!this.currentNote) {
      this.updateStatus("No hay nota actual para exportar.", "error", 3e3);
      return;
    }
    let content = "";
    let filename = (this.currentNote.title || "Nota_Sin_T\xEDtulo").replace(/[^\w\s.-]/gi, "_").replace(/\s+/g, "_");
    let mimeType = "text/plain;charset=utf-8";
    if (contentSource === "polished") {
      filename = `${filename}_pulida`;
      if (format === "md") {
        content = this.currentNote.polishedMarkdown || this.getPlainText(this.currentNote.polishedHTML);
        mimeType = "text/markdown;charset=utf-8";
        filename += ".md";
      } else {
        content = this.getPlainText(this.currentNote.polishedHTML);
        filename += ".txt";
      }
    } else {
      filename = `${filename}_borrador`;
      content = this.getPlainText(this.currentNote.rawText);
      if (format === "md") {
        mimeType = "text/markdown;charset=utf-8";
        filename += ".md";
      } else {
        filename += ".txt";
      }
    }
    if (!content.trim()) {
      const sourceName = contentSource === "polished" ? "la nota pulida" : "el borrador";
      this.updateStatus(`El contenido de ${sourceName} est\xE1 vac\xEDo.`, "active", 3e3);
      return;
    }
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.updateStatus(`Nota exportada como ${format.toUpperCase()}.`, "success", 2e3);
    } catch (error) {
      console.error("Error al exportar nota:", error);
      this.updateStatus("Error al exportar la nota.", "error", 4e3);
    }
  }
  checkInitialTheme() {
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const currentTheme = localStorage.getItem("theme");
    const themeIcon = this.themeToggleButton.querySelector("i");
    if (currentTheme === "dark" || !currentTheme && prefersDark) {
      document.body.classList.add("dark-mode");
      document.body.classList.remove("light-mode");
      if (themeIcon) themeIcon.className = "fas fa-moon";
      this.themeToggleButton.setAttribute("aria-label", "Cambiar a tema claro");
    } else {
      document.body.classList.add("light-mode");
      document.body.classList.remove("dark-mode");
      if (themeIcon) themeIcon.className = "fas fa-sun";
      this.themeToggleButton.setAttribute("aria-label", "Cambiar a tema oscuro");
    }
  }
  toggleTheme() {
    document.body.classList.toggle("light-mode");
    document.body.classList.toggle("dark-mode");
    let theme = "light";
    const icon = this.themeToggleButton.querySelector("i");
    if (document.body.classList.contains("dark-mode")) {
      theme = "dark";
      if (icon) icon.className = "fas fa-moon";
      this.themeToggleButton.setAttribute("aria-label", "Cambiar a tema claro");
    } else {
      if (icon) icon.className = "fas fa-sun";
      this.themeToggleButton.setAttribute("aria-label", "Cambiar a tema oscuro");
    }
    localStorage.setItem("theme", theme);
  }
  async toggleRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }
  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.updateStatus("Grabando... Acceso al micr\xF3fono concedido.", "success", 3e3);
      this.recordButton.classList.add("recording");
      this.recordButton.querySelector("i").className = "fas fa-stop";
      this.recordButton.title = "Detener Grabaci\xF3n";
      this.recordButton.setAttribute("aria-label", "Detener grabaci\xF3n");
      this.setControlsDisabledState(true, true);
      this.recordingInterface.classList.add("is-live");
      this.mainContent.classList.add("has-live-panel");
      this.liveRecordingTitle.style.display = "block";
      this.liveWaveformCanvas.style.display = "block";
      this.liveRecordingTimerDisplay.style.display = "block";
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (event) => this.audioChunks.push(event.data);
      this.mediaRecorder.onstop = () => this.processAudio(stream);
      this.mediaRecorder.start();
      this.audioContext = new AudioContext();
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = Math.max(256, LIVE_WAVEFORM_SAMPLES * 2);
      this.microphoneSource = this.audioContext.createMediaStreamSource(stream);
      this.microphoneSource.connect(this.analyserNode);
      this.waveformDataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.drawLiveWaveform();
      this.liveRecordingStartTime = Date.now();
      if (this.liveRecordingTimerIntervalId) clearInterval(this.liveRecordingTimerIntervalId);
      this.liveRecordingTimerIntervalId = window.setInterval(() => this.updateLiveTimer(), 50);
    } catch (err) {
      console.error("Error al acceder al micr\xF3fono:", err);
      let message = "Acceso al micr\xF3fono denegado. Verifica los permisos en tu navegador.";
      if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        message = "No se encontr\xF3 un micr\xF3fono. Conecta uno e int\xE9ntalo de nuevo.";
      } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        message = "Permiso para usar el micr\xF3fono denegado.";
      }
      this.updateStatus(message, "error", 5e3);
      this.setControlsDisabledState(false, true);
    }
  }
  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.stop();
      this.updateStatus("Grabaci\xF3n detenida. Procesando...", "active");
      this.recordButton.classList.remove("recording");
      this.recordButton.querySelector("i").className = "fas fa-microphone";
      this.recordButton.title = "Iniciar Grabaci\xF3n";
      this.recordButton.setAttribute("aria-label", "Iniciar grabaci\xF3n");
      this.recordingInterface.classList.remove("is-live");
      this.mainContent.classList.remove("has-live-panel");
      this.liveRecordingTitle.style.display = "none";
      this.liveWaveformCanvas.style.display = "none";
      this.liveRecordingTimerDisplay.style.display = "none";
      if (this.waveformAnimationId) cancelAnimationFrame(this.waveformAnimationId);
      if (this.microphoneSource) this.microphoneSource.disconnect();
      if (this.analyserNode) this.analyserNode.disconnect();
      if (this.audioContext && this.audioContext.state !== "closed") this.audioContext.close().catch(console.error);
      if (this.liveRecordingTimerIntervalId) clearInterval(this.liveRecordingTimerIntervalId);
      this.liveRecordingTimerIntervalId = null;
    }
  }
  setControlsDisabledState(disabled, isRecordingRelated = false) {
    this.newButton.disabled = disabled;
    this.audioUploadButton.disabled = disabled;
    this.historyButton.disabled = disabled;
    if (isRecordingRelated) {
      this.polishTextButton.disabled = disabled || this.isRawTranscriptionEmpty();
      this.retryPolishButton.disabled = disabled || this.isRawTranscriptionEmpty();
    } else {
      this.polishTextButton.disabled = this.isRawTranscriptionEmpty();
      this.retryPolishButton.disabled = this.isRawTranscriptionEmpty();
    }
  }
  updateAllButtonStates() {
    const isRecording = this.mediaRecorder?.state === "recording";
    this.setControlsDisabledState(isRecording, true);
    const rawIsEmpty = this.isRawTranscriptionEmpty();
    this.polishTextButton.disabled = rawIsEmpty || isRecording;
    this.retryPolishButton.disabled = rawIsEmpty || isRecording;
    this.updateTopCopyButtonVisibility();
    const polishedIsEmpty = this.isPolishedNoteEmpty();
    this.copyPolishedButton.disabled = polishedIsEmpty;
    this.exportPolishedTxtButton.disabled = polishedIsEmpty;
    this.exportPolishedMdButton.disabled = polishedIsEmpty;
    this.copyRawButton.disabled = rawIsEmpty;
    this.exportRawTxtButton.disabled = rawIsEmpty;
    this.exportRawMdButton.disabled = rawIsEmpty;
    this.currentNotePolishModeSelect.disabled = this.isRawTranscriptionEmpty() && this.isPolishedNoteEmpty();
  }
  isRawTranscriptionEmpty() {
    if (this.rawTranscription.classList.contains("placeholder-active")) {
      return true;
    }
    const liveText = this.getPlainText(this.rawTranscription.innerHTML);
    return liveText.trim() === "";
  }
  isPolishedNoteEmpty() {
    if (!this.currentNote) return true;
    return this.polishedNote.classList.contains("placeholder-active") || this.getPlainText(this.currentNote.polishedHTML).trim() === "";
  }
  updateTopCopyButtonVisibility() {
    const polishedIsEmpty = this.isPolishedNoteEmpty();
    this.topCopyPolishedButton.style.display = polishedIsEmpty ? "none" : "flex";
    this.topCopyPolishedButton.disabled = polishedIsEmpty;
  }
  drawLiveWaveform() {
    if (!this.liveWaveformContext || !this.analyserNode || !this.waveformDataArray || !this.liveWaveformCanvas) {
      return;
    }
    this.waveformAnimationId = requestAnimationFrame(() => this.drawLiveWaveform());
    this.analyserNode.getByteTimeDomainData(this.waveformDataArray);
    this.liveWaveformContext.fillStyle = getComputedStyle(document.body).getPropertyValue("--glass-recording-bg").trim();
    this.liveWaveformContext.fillRect(0, 0, this.liveWaveformCanvas.width, this.liveWaveformCanvas.height);
    this.liveWaveformContext.lineWidth = 2;
    this.liveWaveformContext.strokeStyle = getComputedStyle(document.body).getPropertyValue("--color-accent").trim();
    this.liveWaveformContext.beginPath();
    const sliceWidth = this.liveWaveformCanvas.width * 1 / this.analyserNode.frequencyBinCount;
    let x = 0;
    for (let i = 0; i < this.analyserNode.frequencyBinCount; i++) {
      const v = this.waveformDataArray[i] / 128;
      const y = v * this.liveWaveformCanvas.height / 2;
      if (i === 0) {
        this.liveWaveformContext.moveTo(x, y);
      } else {
        this.liveWaveformContext.lineTo(x, y);
      }
      x += sliceWidth;
    }
    this.liveWaveformContext.lineTo(this.liveWaveformCanvas.width, this.liveWaveformCanvas.height / 2);
    this.liveWaveformContext.stroke();
  }
  updateLiveTimer() {
    if (!this.liveRecordingStartTime) return;
    const elapsed = Date.now() - this.liveRecordingStartTime;
    const totalSeconds = Math.floor(elapsed / 1e3);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    const milliseconds = Math.floor(elapsed % 1e3 / 10).toString().padStart(2, "0");
    this.liveRecordingTimerDisplay.textContent = `${minutes}:${seconds}.${milliseconds}`;
  }
  async processAudio(stream) {
    try {
      const audioBlob = new Blob(this.audioChunks, { type: this.audioChunks[0]?.type || "audio/webm" });
      const base64Audio = await this.blobToBase64(audioBlob);
      this.updateStatus("Audio grabado. Transcribiendo...", "active");
      const rawText = await this.getTranscription(base64Audio, audioBlob.type);
      if (!this.currentNote || this.isCurrentNoteEmpty()) {
        if (!this.currentNote) this.createNewNoteUIAction();
        if (this.currentNote && (!this.currentNote.title || this.currentNote.title === this.editorTitlePlaceholder)) {
          const newTitle = await this.generateTitleForNote(rawText.substring(0, 500));
          this.currentNote.title = newTitle || `Grabaci\xF3n ${(/* @__PURE__ */ new Date()).toLocaleTimeString()}`;
        }
      }
      if (this.currentNote) {
        this.currentNote.rawText = rawText;
        this.currentNote.polishedHTML = "";
        this.currentNote.polishedMarkdown = "";
        this.currentNote.lastModified = Date.now();
        this.saveCurrentNote(true);
        this.updateUIFromCurrentNote();
        this.updateStatus("Transcripci\xF3n completada.", "success", 2e3);
        const rawTabButton = document.querySelector('.tab-button[data-tab="raw"]');
        if (rawTabButton && typeof window.setActiveTab === "function") {
          window.setActiveTab(rawTabButton);
        }
      }
    } catch (error) {
      console.error("Error al procesar audio:", error);
      this.updateStatus(`Error procesando audio: ${error.message}`, "error", 5e3);
    } finally {
      stream.getTracks().forEach((track) => track.stop());
      this.setControlsDisabledState(false, false);
      this.updateAllButtonStates();
    }
  }
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result.split(",")[1]);
        } else {
          reject(new Error("FileReader did not return a string."));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  async getTranscription(base64Audio, audioMimeType) {
    try {
      this.updateStatus("Transcribiendo con Gemini...", "active");
      const audioPart = { inlineData: { mimeType: audioMimeType, data: base64Audio } };
      const textPart = { text: "Transcribe this audio accurately. Respond only with the transcription." };
      const response = await this.genAI.models.generateContent({
        model: MODEL_NAME,
        contents: { parts: [audioPart, textPart] }
      });
      const textFromResult = response.text;
      const transcription = typeof textFromResult === "string" ? textFromResult : await textFromResult;
      if (!transcription || transcription.trim() === "") {
        this.updateStatus("Gemini no pudo transcribir el audio o est\xE1 vac\xEDo.", "active", 3e3);
        return "";
      }
      this.updateStatus("Transcripci\xF3n recibida de Gemini.", "success", 1500);
      return transcription;
    } catch (error) {
      console.error("Error en la transcripci\xF3n con Gemini:", error);
      this.updateStatus(`Error de Gemini al transcribir: ${error.message || "Desconocido"}`, "error", 5e3);
      throw error;
    }
  }
  async generateTitleForNote(textSample) {
    if (!textSample || textSample.trim().length < 10) {
      return `Nota ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`;
    }
    try {
      const prompt = `Generate a very short, concise title (max 5 words, ideally 2-3) for the following text. Respond only with the title itself, no extra explanations. The text is in Spanish, provide title in Spanish:

${textSample}`;
      const geminiResponse = await this.genAI.models.generateContent({
        model: MODEL_NAME,
        contents: prompt
      });
      const textFromResult = geminiResponse.text;
      const title = typeof textFromResult === "string" ? textFromResult : await textFromResult;
      return title.trim().replace(/^"|"$/g, "");
    } catch (error) {
      console.error("Error generando t\xEDtulo con Gemini:", error);
      return `Nota ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`;
    }
  }
  handleManualPolishWithCurrentSettings() {
    if (!this.currentNote || this.isRawTranscriptionEmpty()) {
      this.updateStatus("Nada que pulir. Escribe o graba algo en 'Borrador'.", "active", 3e3);
      return;
    }
    const selectedModeInHeader = this.currentNotePolishModeSelect.value;
    this.currentPolishMode = selectedModeInHeader;
    this.currentNote.polishModeUsed = selectedModeInHeader;
    if (selectedModeInHeader === "custom") {
      if (!this.currentNote.customPromptUsed && !this.customPromptTextarea.value.trim()) {
        this.updateStatus("Modo personalizado seleccionado. Por favor, define un prompt.", "active", 3e3);
        this.polishModeSelect.value = "custom";
        this.customPromptTextarea.value = this.currentCustomPolishPrompt || "";
        this.handlePolishModeChangeInModal();
        this.togglePolishOptionsModal(true);
        return;
      }
      this.currentCustomPolishPrompt = this.currentNote.customPromptUsed || this.customPromptTextarea.value.trim();
      this.currentNote.customPromptUsed = this.currentCustomPolishPrompt;
    } else {
      this.currentCustomPolishPrompt = "";
      delete this.currentNote.customPromptUsed;
    }
    this.saveCurrentNote(false);
    this.polishText(this.currentNote.rawText);
  }
  async polishText(rawTextHTML) {
    if (!this.currentNote) return;
    const plainRawText = this.getPlainText(rawTextHTML);
    if (!plainRawText || plainRawText.trim() === "" || this.rawTranscription.classList.contains("placeholder-active")) {
      this.updateStatus("El borrador est\xE1 vac\xEDo. Nada que pulir.", "active", 3e3);
      return;
    }
    try {
      this.updateStatus("Puliendo con Gemini...", "active");
      const polishedResult = await this.getPolishedNoteFromText(plainRawText, this.currentPolishMode, this.currentCustomPolishPrompt);
      if ((this.currentNote.title === "" || this.currentNote.title === this.editorTitlePlaceholder) && plainRawText.trim().length >= 10) {
        const newTitle = await this.generateTitleForNote(plainRawText.substring(0, 500));
        if (newTitle) {
          this.currentNote.title = newTitle;
        }
      }
      this.currentNote.polishedHTML = polishedResult.html;
      this.currentNote.polishedMarkdown = polishedResult.markdown;
      this.currentNote.polishModeUsed = this.currentPolishMode;
      if (this.currentPolishMode === "custom") {
        this.currentNote.customPromptUsed = this.currentCustomPolishPrompt;
      } else {
        delete this.currentNote.customPromptUsed;
      }
      this.currentNote.lastModified = Date.now();
      this.saveCurrentNote(true);
      this.updateUIFromCurrentNote();
      this.updateStatus("Nota pulida con Gemini.", "success", 2e3);
      const polishedTabButton = document.querySelector('.tab-button[data-tab="note"]');
      if (polishedTabButton && typeof window.setActiveTab === "function") {
        window.setActiveTab(polishedTabButton);
      }
    } catch (error) {
      console.error("Error puliendo texto con Gemini:", error);
      this.updateStatus(`Error de Gemini al pulir: ${error.message || "Desconocido"}`, "error", 5e3);
    }
  }
  async getPolishedNoteFromText(text, mode, customPrompt) {
    let prompt = "";
    const commonInstructions = "Formatea la respuesta usando Markdown. Aseg\xFArate de que la respuesta est\xE9 en espa\xF1ol.";
    switch (mode) {
      case "concise_summary":
        prompt = `Resume el siguiente texto de forma concisa y clara. Enf\xF3cate en las ideas principales. ${commonInstructions}

Texto:
${text}`;
        break;
      case "bullet_points":
        prompt = `Extrae los puntos clave del siguiente texto y pres\xE9ntalos como una lista de vi\xF1etas. ${commonInstructions}

Texto:
${text}`;
        break;
      case "formal_tone":
        prompt = `Reformula el siguiente texto para que tenga un tono m\xE1s formal y profesional, manteniendo el significado original. ${commonInstructions}

Texto:
${text}`;
        break;
      case "custom":
        if (!customPrompt || customPrompt.trim() === "") {
          throw new Error("El prompt personalizado no puede estar vac\xEDo para el modo personalizado.");
        }
        const customPromptFinal = customPrompt.toLowerCase().includes("espa\xF1ol") || customPrompt.toLowerCase().includes("spanish") ? customPrompt : `${customPrompt}
Aseg\xFArate de que la respuesta est\xE9 en espa\xF1ol si el texto de entrada lo est\xE1.`;
        prompt = `${customPromptFinal}

Texto de referencia (si es necesario para el prompt):
${text}`;
        break;
      case "standard":
      default:
        prompt = `Take this raw transcript and create a well-formatted, polished note.
Eliminate filler words (ums, uhs, likes), repetitions, and false starts.
Correctly format any lists or bullet points. Use markdown formatting for headings, lists, etc.
Retain all original content and meaning.
Ensure the response is in Spanish if the input text is in Spanish.

Raw Transcript:
${text}`;
        break;
    }
    try {
      const geminiResponse = await this.genAI.models.generateContent({
        model: MODEL_NAME,
        contents: prompt
      });
      const textFromResult = geminiResponse.text;
      const polishedMarkdown = typeof textFromResult === "string" ? textFromResult : await textFromResult;
      if (!polishedMarkdown || polishedMarkdown.trim() === "") {
        return { html: "<p>Gemini no gener\xF3 contenido pulido.</p>", markdown: "" };
      }
      const html = this.markdownParser.parse(polishedMarkdown);
      return { html, markdown: polishedMarkdown };
    } catch (error) {
      console.error("Error en getPolishedNoteFromText con Gemini:", error);
      throw new Error(`Error de Gemini: ${error.message || "Desconocido"}`);
    }
  }
  updateStatus(message, type = "active", duration = 3e3) {
    this.recordingStatus.textContent = message;
    this.recordingStatus.className = `status-text visible status-${type}`;
    if (this.statusClearTimeout) clearTimeout(this.statusClearTimeout);
    if (type === "success" || type === "error") {
      this.statusClearTimeout = window.setTimeout(() => {
        this.recordingStatus.className = "status-text";
      }, duration);
    } else if (type === "active") {
      if (duration !== Infinity && duration > 0) {
        this.statusClearTimeout = window.setTimeout(() => {
          this.recordingStatus.className = "status-text";
        }, duration);
      }
    }
  }
  updateWordCharCount(type) {
    const element = type === "polished" ? this.polishedNote : this.rawTranscription;
    const counterElement = type === "polished" ? this.polishedCounters : this.rawCounters;
    if (!element || !counterElement) return;
    const text = this.getPlainText(element.innerHTML);
    const isEmptyOrPlaceholder = element.classList.contains("placeholder-active") || !text.trim();
    if (isEmptyOrPlaceholder) {
      counterElement.textContent = "";
      return;
    }
    const words = text.match(/\b\w+\b/g)?.length || 0;
    const chars = text.length;
    counterElement.textContent = `${words} palabra${words !== 1 ? "s" : ""}, ${chars} caracter${chars !== 1 ? "es" : ""}`;
  }
  updateAllWordCharCounts() {
    this.updateWordCharCount("polished");
    this.updateWordCharCount("raw");
  }
};
new App();
/*! Bundled license information:

@google/genai/dist/web/index.mjs:
@google/genai/dist/web/index.mjs:
@google/genai/dist/web/index.mjs:
  (**
   * @license
   * Copyright 2025 Google LLC
   * SPDX-License-Identifier: Apache-2.0
   *)
*/
