var OpenAI = Class.create();
OpenAI.prototype = {
    initialize: function() {
        var gr = new GlideRecord("api_key_credentials");
        gr.addQuery("name", "OpenAI");
        gr.setLimit(1);
        gr.query();
        gr.next();
        this.key = gr.api_key.getDecryptedValue();
    },

    createChatCompletionToString: function(input, record, alternativePrompt, customModel, customTemperature) {
        return JSON.stringify(this.createChatCompletion(input, record, alternativePrompt, customModel, customTemperature));
    },

    createChatCompletion: function(input, record, alternativePrompt, customModel, customTemperature) {

        var req = record || '';
        var prompt = alternativePrompt || "You are a helpful assistant";
        var model = customModel || "gpt-3.5-turbo";
        var temperature = customTemperature || 1;

        var messages = [{
            "role": "system",
            "content": prompt
        }, ];

        if (typeof(input) == 'object') {
            for (var i = 0; i < input.length; i++) {
                messages.push({
                    "role": input[i].role,
                    "content": input[i].content,
                });
            }
        } else {
            messages.push({
                "role": "user",
                "content": input,
            });
        }

        var response;
        var httpStatus;
        var responseBody;
        try {
            var r = new sn_ws.RESTMessageV2('OpenAI', 'Create chat completion');
            r.setStringParameterNoEscape('token', this.key);
            var body = {
                "model": model,
                "temperature": temperature,
                "stream": false,
                "messages": messages
            };

            r.setRequestBody(JSON.stringify(body));
            response = r.execute();
            httpStatus = response.getStatusCode();
            responseBody = response.getBody();
            var responseBodyObj = JSON.parse(responseBody);
            var gr = new GlideRecord('u_open_ai');


            var lastInput = messages[messages.length - 1].content;

            gr.initialize();
            gr.setValue('u_raw_input', JSON.stringify(body));
            gr.setValue('u_estimated_prompt_token', this.getTokenEstimate(body));
            gr.setValue('u_raw_output', responseBody.toString());
            gr.setValue('u_gliderecord', req);
            gr.setValue('u_last_input', lastInput);
            gr.setValue('u_user', gs.getUser().getID());
            gr.setValue('u_http_status_code', httpStatus);
            gr.insert();

            return {
                'responseBody': responseBody,
                'httpStatus': httpStatus,
                'content': responseBodyObj.choices[0].message.content
            };
        } catch (ex) {
            return {
                'responseBody': responseBody,
                'httpStatus': httpStatus,
            };
        }
    },

    getTokenEstimate: function(obj) {
        function countTokens(str) {
            return str.split(' ').length +
                str.split(/[^a-zA-Z0-9]/).length;
        }

        return obj.messages
            .map(function(message) {
                return countTokens(message.content);
            })
            .reduce(function(a, b) {
                return a + b;
            }, 0);
    },

    shortenToLimit: function(str, limit) {
        var tokenLimit = limit || 3000;

        function countTokens(str) {
            return str.split(' ').length + str.split(/[^a-zA-Z0-9]/).length;
        }

        while (countTokens(str) > tokenLimit) {
            str = str.substring(0, str.length - 1);
        }

        return str;
    },

    shortenObject: function(messages, maxTokenSize) {
        var result = [];
        var tokens = 0;
        var chunk = [];
        for (var i = 0; i < messages.length; i++) {
            var messageTokens = messages[i].content.length;
            if (tokens + messageTokens <= maxTokenSize) {
                tokens += messageTokens;
                chunk.push(messages[i]);
            } else {
                result.push(chunk);
                tokens = messageTokens;
                chunk = [messages[i]];
            }
        }
        result.push(chunk);
        return result;
    },

    type: 'OpenAI'
};
