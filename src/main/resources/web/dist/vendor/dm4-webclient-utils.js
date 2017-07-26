/**
 * A REST client for the DeepaMehta Core Service.
 *
 * @param   config
 *              Optional: an object with these properties:
 *                  on_send_request
 *                      Optional: the callback invoked before a request is sent (a function).
 *                      One argument is passed: the request, an object with 4 properties:
 *                          method -- read only (string).
 *                          uri    -- r/w (string)
 *                          header -- r/w (object of name/value pairs, might be empty)
 *                          data   -- read only. An existing request.data object can be manipulated in place though.
 *                      The caller can manipulate the request before it is sent.
 *                  on_request_error
 *                      Optional: the "global error handler" to be invoked when a request fails (a function).
 *                      One argument is passed: the server response, an object with 4 properties:
 *                          content_type -- (string)
 *                          content      -- (string)
 *                          status_code  -- (number)
 *                          status_text  -- (string)
 *                      In case of content type "application/json" the content might represent the (Java) exception as
 *                      occurred at server-side: a JSON object with "exception", "message", and "cause" properties.
 *                      The "cause" value is again an exception object. The final exception has no "cause" property.
 *                  process_directives
 *                      Optional: the callback invoked to process the directives received from the server (a function).
 *                      One argument is passed: the directives (array of directive).
 */
function RESTClient(config) {

    // -------------------------------------------------------------------------------------------------- Public Methods



    // === Topics ===

    this.get_topic_by_id = function(topic_id, include_childs, include_assoc_childs) {
        var params = new QueryParams({include_childs: include_childs, include_assoc_childs: include_assoc_childs})
        return request("GET", "/core/topic/" + topic_id + params)
    }

    this.get_topic_by_uri = function(uri, include_childs, include_assoc_childs) {
        var params = new QueryParams({include_childs: include_childs, include_assoc_childs: include_assoc_childs})
        return request("GET", "/core/topic/by_uri/" + uri + params)
    }

    /**
     * Looks up a topic by exact property value.
     * If no such topic exists <code>null</code> is returned.
     * If more than one topic is found a runtime exception is thrown. FIXME: check this.
     * <p>
     * IMPORTANT: Looking up a topic this way requires the property to be indexed with indexing mode <code>KEY</code>.
     *
     * @return  the topic, or <code>null</code>.
     */
    this.get_topic_by_value = function(key, value, include_childs) {
        var params = new QueryParams({include_childs: include_childs})
        return request("GET", "/core/topic/by_value/" + key + "/" + encodeURIComponent(value) + params)
    }

    this.get_topics_by_value = function(key, value, include_childs) {
        var params = new QueryParams({include_childs: include_childs})
        return request("GET", "/core/topic/multi/by_value/" + key + "/" + encodeURIComponent(value) + params)
    }

    /**
     * ### TODO: rename to get_topics_by_type
     *
     * @param   sort                Optional: Result sorting.
     *                              If evaluates to true the returned topics are sorted.
     *
     * @return  An object with 1 property:
     *              "items"       - array of topics, possibly empty. ### FIXDOC
     */
    this.get_topics = function(type_uri, include_childs, sort) {
        var params = new QueryParams({include_childs: include_childs})
        var result = request("GET", "/core/topic/by_type/" + type_uri + params)
        if (sort) {
            this.sort_topics(result)
        }
        return result
    }

    /**
     * @param   traversal_filter    Optional: Traversal Filtering.
     *                              An object with 4 possible properties (each one is optional):
     *                                  "assoc_type_uri"
     *                                  "my_role_type_uri"
     *                                  "others_role_type_uri"
     *                                  "others_topic_type_uri"
     *                              If not specified no filter is applied.
     * @param   sort                Optional: Result sorting.
     *                              If evaluates to true the returned topics are sorted.
     *
     * @return  An object with 1 property:
     *              "items"       - array of topics, possibly empty.
     */
    this.get_topic_related_topics = function(topic_id, traversal_filter, sort) {
        var params = new QueryParams(traversal_filter)
        var result = request("GET", "/core/topic/" + topic_id + "/related_topics" + params)
        if (sort) {
            this.sort_topics(result)
        }
        return result
    }

    this.search_topics = function(text, field_uri) {
        var params = new QueryParams({search: text, field: field_uri})
        return request("GET", "/core/topic" + params)
    }

    this.create_topic = function(topic_model) {
        return request("POST", "/core/topic", topic_model)
    }

    this.update_topic = function(topic_model) {
        return request("PUT", "/core/topic/" + topic_model.id, topic_model)
    }

    this.delete_topic = function(id) {
        return request("DELETE", "/core/topic/" + id)
    }



    // === Associations ===

    this.get_association_by_id = function(assoc_id, include_childs) {
        var params = new QueryParams({include_childs: include_childs})
        return request("GET", "/core/association/" + assoc_id + params)
    }

    /**
     * Returns the association between two topics, qualified by association type and both role types.
     * If no such association exists <code>null</code> is returned.
     * If more than one association exist, an exception is thrown.
     *
     * @param   assoc_type_uri  Association type filter.
     *
     * @return  The association (a JavaScript object).
     */
    this.get_association = function(assoc_type_uri, topic1_id, topic2_id, role_type1_uri, role_type2_uri,
                                                                                          include_childs) {
        var params = new QueryParams({include_childs: include_childs})
        return request("GET", "/core/association/" + assoc_type_uri + "/" +  topic1_id + "/" + topic2_id + "/" +
            role_type1_uri + "/" + role_type2_uri + params)
    }

    /**
     * Returns the associations between two topics. If no such association exists an empty array is returned.
     *
     * @param   assoc_type_uri  Association type filter (optional).
     *                          If not specified (that is any falsish value) no filter is applied.
     *
     * @return  An array of associations.
     */
    this.get_associations = function(topic1_id, topic2_id, assoc_type_uri) {
        return request("GET", "/core/association/multiple/" + topic1_id + "/" + topic2_id + "/" +
            (assoc_type_uri || ""))
    }

    /**
     * @param   traversal_filter    Optional: Traversal Filtering.
     *                              An object with 4 possible properties (each one is optional):
     *                                  "assoc_type_uri"
     *                                  "my_role_type_uri"
     *                                  "others_role_type_uri"
     *                                  "others_topic_type_uri"
     *                              If not specified no filter is applied.
     * @param   sort                Optional: Result sorting.
     *                              If evaluates to true the returned topics are sorted.
     *
     * @return  An object with 1 property:
     *              "items"       - array of topics, possibly empty.
     */
    this.get_association_related_topics = function(assoc_id, traversal_filter, sort) {
        var params = new QueryParams(traversal_filter)
        var result = request("GET", "/core/association/" + assoc_id + "/related_topics" + params)
        if (sort) {
            this.sort_topics(result)
        }
        return result
    }

    this.create_association = function(assoc_model) {
        return request("POST", "/core/association", assoc_model)
    }

    // ### TODO: remove stay_in_edit_mode parameter
    this.update_association = function(assoc_model, stay_in_edit_mode) {
        return request("PUT", "/core/association/" + assoc_model.id, assoc_model, undefined, undefined, undefined,
                                                                                  undefined, stay_in_edit_mode)
    }

    this.delete_association = function(id) {
        return request("DELETE", "/core/association/" + id)
    }



    // === Topic Types ===

    this.get_topic_type = function(type_uri) {
        return request("GET", "/core/topictype/" + type_uri)
    }

    this.get_topic_type_implicitly = function(topic_id) {
        return request("GET", "/core/topictype/topic/" + topic_id)
    }

    this.get_all_topic_types = function(callback) {
        request("GET", "/core/topictype/all", undefined, callback)
    }

    this.create_topic_type = function(topic_type_model) {
        return request("POST", "/core/topictype", topic_type_model)
    }

    this.update_topic_type = function(topic_type_model) {
        return request("PUT", "/core/topictype", topic_type_model)
    }

    this.delete_topic_type = function(type_uri) {
        return request("DELETE", "/core/topictype/" + type_uri)
    }



    // === Association Types ===

    this.get_association_type = function(type_uri) {
        return request("GET", "/core/assoctype/" + type_uri)
    }

    this.get_association_type_implicitly = function(assoc_id) {
        return request("GET", "/core/assoctype/assoc/" + assoc_id)
    }

    this.get_all_association_types = function(callback) {
        request("GET", "/core/assoctype/all", undefined, callback)
    }

    this.create_association_type = function(assoc_type_model) {
        return request("POST", "/core/assoctype", assoc_type_model)
    }

    this.update_association_type = function(assoc_type_model) {
        return request("PUT", "/core/assoctype", assoc_type_model)
    }

    this.delete_association_type = function(type_uri) {
        return request("DELETE", "/core/assoctype/" + type_uri)
    }



    // === Role Types ===

    this.create_role_type = function(topic_model) {
        return request("POST", "/core/roletype", topic_model)
    }



    // === Plugins ===

    this.get_plugins = function() {
        return request("GET", "/core/plugin")
    }



    // === Plugin Support ===

    /**
     * Sends an AJAX request.
     *
     * A plugin uses this method to send a request to its REST service.
     * As an example see the DeepaMehta 4 Topicmaps plugin.
     */
    this.request = function(method, uri, data, callback, headers, response_data_type, on_error) {
        return request(method, uri, data, callback, headers, response_data_type, on_error)
    }

    /**
     * Helps with construction of the URI's query string part.
     *
     * This helper method might be useful for plugins which provides a REST service.
     * As an example see the DeepaMehta 4 Webclient plugin.
     */
    this.queryParams = function(params) {
        return new QueryParams(params)
    }

    this.sort_topics = function(topics) {
        topics.sort(function(topic_1, topic_2) {
            if (topic_1.type_uri != topic_2.type_uri) {
                // 1st sort criteria: topic type
                return compare(topic_1.type_uri, topic_2.type_uri)
            } else {
                // 2nd sort criteria: topic value
                if (typeof topic_1.value == "string") {
                    return compare(topic_1.value.toLowerCase(), topic_2.value.toLowerCase())
                } else {
                    return compare(topic_1.value, topic_2.value)
                }
            }

            function compare(val_1, val_2) {
                return val_1 < val_2 ? -1 : val_1 == val_2 ? 0 : 1
            }
        })
    }



    // ----------------------------------------------------------------------------------------------- Private Functions

    /**
     * Sends an AJAX request.
     *
     * @param   method              The HTTP method: "GET", "POST", "PUT", "DELETE".
     * @patam   uri                 The request URI, including query parameters.
     * @param   data                Optional: the data to be sent to the server (an object). By default the data object
     *                              is serialized to JSON format. Note: key/value pairs with undefined values are not
     *                              serialized.
     *                              To use an alternate format set the Content-Type header (see "headers" parameter).
     * @param   callback            Optional: the function to be called if the request is successful. One argument is
     *                              passed: the data returned from the server.
     *                              If not specified, the request is send synchronously.
     * @param   headers             Optional: a map of additional header key/value pairs to send along with the request.
     * @param   response_data_type  Optional: affects the "Accept" header to be sent and controls the post-processing
     *                              of the response data. 2 possible values:
     *                                  "json" - the response data is parsed into a JavaScript object. The default.
     *                                  "text" - the response data is returned as is.
     * @param   on_error            Optional: the "per-request error handler" to be invoked when the request fails
     *                              (a function). One argument is passed: the server response (see global error handler
     *                              in RESTClient constructor).
     *                              By returning false the per-request error handler can prevent the global error
     *                              handler from being invoked.
     *
     * @return  For successful synchronous requests: the data returned from the server. Otherwise undefined.
     *
     * ### TODO: remove stay_in_edit_mode parameter
     */
    function request(method, uri, data, callback, headers, response_data_type, on_error, stay_in_edit_mode) {
        var request = {
            method: method,
            uri: uri,
            headers: headers || {},
            data: data
        }
        if (config && config.on_send_request) {
            config.on_send_request(request)
        }
        //
        var async = callback != undefined
        var status          // used only for synchronous request: "success" if request was successful
        var response_data   // used only for synchronous successful request: the response data (response body)
        //
        var content_type = request.headers["Content-Type"] || "application/json"       // set default
        if (content_type == "application/json") {
            data = JSON.stringify(data)
        }
        //
        response_data_type = response_data_type || "json"
        //
        $.ajax({
            type: method,
            url: request.uri,
            contentType: content_type,
            headers: request.headers,
            data: data,
            dataType: response_data_type,
            processData: false,
            async: async
        })
        .done(function(data, text_status, jq_xhr) {
            if (callback) {
                callback(data)
            }
            response_data = data
        })
        .fail(function(jq_xhr, text_status, error_thrown) {
            var server_response = {
                content_type: jq_xhr.getResponseHeader("Content-Type"),
                content:      jq_xhr.responseText,
                status_code:  jq_xhr.status,
                status_text:  jq_xhr.statusText
            }
            console.error("Server response:", server_response)
            // Note: by returning false the per-request error handler can prevent the global error handler
            var prevent_default_error = on_error && on_error(server_response) == false
            if (!prevent_default_error && config && config.on_request_error) {
                config.on_request_error(server_response)
            }
            // Note: since at least jQuery 2.0.3 an exception thrown from the "error" callback (as registered in the
            // $.ajax() settings object) does not reach the calling plugin. (In jQuery 1.7.2 it did.) Apparently the
            // exception is catched by jQuery. That's why we use the Promise style to register our callbacks (done(),
            // fail(), always()). An exception thrown from fail() does reach the calling plugin.
            throw "RESTClientError: " + method + " request failed (" + text_status + ": " + error_thrown + ")"
        })
        .always(function(dummy, text_status) {
            // Note: the signature of the always() callback varies. Depending on the response status it takes
            // shape either of the done() or the fail() callback.
            //
            // "text_status" comprises 3 success strings: "success", "notmodified", "nocontent",
            // and 4 error strings:                       "error", "timeout", "abort", "parsererror"
            status = text_status
        })
        //
        if (!async && status == "success") {
            var directives = response_data.directives
            if (directives && config && config.process_directives) {
                // update client model and GUI
                config.process_directives(directives, stay_in_edit_mode)
            }
            return response_data
        }
    }

    /**
     * @params      Optional: initial parameters (object of name-value pairs).
     */
    function QueryParams(params) {

        var self = this

        this.params = []

        for (var name in params) {
            add(name, params[name])
        }

        this.add = function(name, value) {
            add(name, value)
        }

        this.add_list = function(name, value_list) {
            if (value_list) {
                for (var i = 0; i < value_list.length; i++) {
                    add(name, value_list[i])
                }
            }
        }

        function add(name, value) {
            // Do not add null or undefined values. On the other hand false *is* added.
            if (value != null && value != undefined) {
                self.params.push(name + "=" + encodeURIComponent(value))
            }
        }
    }

    QueryParams.prototype.toString = function() {
        var query_string = this.params.join("&")
        if (query_string) {
            query_string = "?" + query_string
        }
        return query_string
    }
}
;/**
 * Generic (DeepaMehta independent) JavaScript Utilities.
 */
var js = {



    // ************************
    // *** Arrays & Objects ***
    // ************************



    /**
     * Returns the first array element that matches a filter function.
     * If there is no such element undefined is returned.
     */
    find: function(array, fn) {
        var i = 0, e
        while (e = array[i]) {
            if (fn(e)) {
                return e
            }
            i++
        }
    },

    /**
     * Keeps array elements that match a filter function.
     * The array is manipulated in-place.
     */
    filter: function(array, fn) {
        var i = 0, e
        while (e = array[i]) {
            if (!fn(e)) {
                array.splice(i, 1)
                continue
            }
            i++
        }
    },

    /**
     * Deletes array elements that match a filter function.
     * The array is manipulated in-place.
     */
    delete: function(array, fn) {
        this.filter(array, function(e) {
            return !fn(e)
        })
    },

    /**
     * Returns an array containing the keys of the object.
     */
    keys: function(object) {
        var a = []
        for (var key in object) {
            a.push(key)
        }
        return a
    },

    size: function(object) {
        var size = 0
        for (var key in object) {
            size++
        }
        return size
    },

    inspect: function(object) {
        var attr_keys = []
        var func_keys = []
        // sort keys
        for (var key in object) {
            if (typeof object[key] == "function") {
                func_keys.push(key)
            } else {
                attr_keys.push(key)
            }
        }
        attr_keys.sort()
        func_keys.sort()
        // build result
        var str = "\n"
        for (var i = 0, key; key = attr_keys[i]; i++) {
            str += key + ": " + object[key] + "\n"
        }
        for (var i = 0, key; key = func_keys[i]; i++) {
            str += "function " + key + "()\n"
        }
        return str
    },

    stringify: function(object) {
        var max_depth = 10
        var str = ""
        stringify(object, 0, "")
        return str

        function stringify(object, depth, indent) {
            switch (typeof object) {
            case "string":
                str += "\"" + object + "\" (string)"
                return
            case "number":
                str += object + " (number)"
                return
            case "boolean":
                str += object + " (boolean)"
                return
            case "object":
                str += (js.is_array(object) ? "[" : "{") + "\n"
                if (depth < max_depth) {
                    for (var key in object) {
                        // skip functions
                        if (typeof object[key] == "function") {
                            continue
                        }
                        //
                        str += indent + "\t" + key + ": "
                        stringify(object[key], depth + 1, indent + "\t")
                        str += "\n"
                    }
                } else {
                    str += indent + "\t" + (js.is_array(object) ? "ARRAY" : "OBJECT") +
                        " NOT SHOWN (max " + max_depth + " levels)\n"
                }
                str += indent + (js.is_array(object) ? "]" : "}")
                return
            case "function":
                // skip
                return
            case "undefined":
                str += "undefined"
                return
            default:
                str += "UNKNOWN (" + typeof(object) + ")"
                return
            }
        }
    },

    /**
     * Returns true if the array contains the object, false otherwise.
     */
    contains: function(array, object) {
        if (!array) {
            return false
        }
        for (var i = 0; i < array.length; i++) {
            if (array[i] == object) {
                return true
            }
        }
        return false
    },

    /**
     * Returns true if the array contains a positive element according to the indicator function.
     */
    includes: function(array, indicator_func) {
        for (var i = 0, e; e = array[i]; i++) {
            if (indicator_func(e)) {
                return true
            }
        }
        return false
    },

    /**
     * Substracts array2 from array1.
     */
    substract: function(array1, array2, fn) {
        js.filter(array1, function(e1) {
             return !js.includes(array2, function(e2) {
                 return fn(e1, e2)
             })
        })
    },

    copy: function(src_obj, dst_obj) {
        for (var prop in src_obj) {
            dst_obj[prop] = src_obj[prop]
        }
    },

    clone: function(obj) {
        try {
            return JSON.parse(JSON.stringify(obj))
        } catch (e) {
            alert("ERROR (clone): " + JSON.stringify(e))
        }
    },

    is_array: function(obj) {
        return Object.prototype.toString.call(obj) == "[object Array]"
        // Note: since Javascript 1.8.5 (Firefox 4) there is Array.isArray(obj).
        // The approach used here is compatible with older Javascript versions and is preferred by ECMA.
    },



    // ***************
    // *** Classes ***
    // ***************



    /**
     * Extends an instance with all the methods defined in a superclass.
     *
     * @param   instance    The object to be extended
     * @param   superclass  The superclass (a function)
     */
    extend: function(instance, superclass) {
        superclass.call(instance)
    },

    class_name: function(instance) {
        return instance.__proto__.constructor.name  // ### TODO: is there a better way?
    },



    // ***************
    // *** Numbers ***
    // ***************



    round: function(val, decimals) {
        var factor = Math.pow(10, decimals)
        return Math.round(factor * val) / factor
    },



    // ************
    // *** Text ***
    // ************



    begins_with: function(text, str) {
        return text.indexOf(str) == 0
    },

    render_text: function(text) {
        return text.replace(/\n/g, "<br>")
    },

    strip_html: function(text) {
        // Compare to the Java-equivalent stripHTML() in JavaUtils.java
        // *? is the reluctant version of the * quantifier (which is greedy).
        return text.replace(/<.*?>/g, "")
    },

    truncate: function(text, max_length) {
        // do not truncate "text" if it's no text (but a number or a boolean) or if there's no need for truncation
        if (!text.length || text.length <= max_length) {
            return text
        }
        var i = text.lastIndexOf(" ", max_length)
        return text.substr(0, i >= 0 ? i : max_length) + " ..."
    },

    filename: function(path) {
        path.match(/.*\/(.*)/)
        return RegExp.$1
    },

    filename_ext: function(path) {
        return path.substr(path.lastIndexOf(".") + 1)
    },

    /**
     * "Type ID" -> "type-id"
     */
    to_id: function(str) {
        str = str.toLowerCase()
        str = str.replace(/ /g, "-")
        return str
    },

    /**
     * @param   date    the date to format (string). If empty (resp. evaluates to false) an empty string is returned.
     *                  Otherwise it must be parsable by the Date constructor, e.g. "12/30/2009".
     */
    format_date: function(date) {
        // For possible format strings see http://docs.jquery.com/UI/Datepicker/formatDate
        return date ? $.datepicker.formatDate("D, M d, yy", new Date(date)) : ""
    },

    format_timestamp: function(timestamp) {
        return new Date(timestamp).toLocaleString()
    },

    /**
     * @param   size    File size in bytes.
     */
    format_file_size: function(size) {
        var units = ["bytes", "KB", "MB", "GB"]
        for (var i = 0; i <= 2; i++) {
            if (size < 1024) {
                return result()
            }
            size /= 1024
        }
        return result()

        function result() {
            var decimals = Math.max(i - 1, 0)
            return js.round(size, decimals) + " " + units[i]
        }
    },

    absolute_http_url: function(url) {
        if (!js.begins_with(url, "http://") && !js.begins_with(url, "https://")) {
            return "http://" + url
        }
        return url
    },

    TextWrapper: function(text, max_width, line_height, ctx) {

        var wrapped_lines = []
        var box_width = 0, box_height   // size of the bounding box

        // cast if number or boolean
        if (!text.split) {
            text = text.toString()
        }
        //
        wrap_text()

        // ---

        this.draw = function(x, y, ctx) {
            var dy = y
            for (var i = 0, line; line = wrapped_lines[i]; i++) {
                ctx.fillText(line, x, dy)
                dy += line_height
            }
        }

        this.get_size = function() {
            return {width: box_width, height: box_height}
        }

        this.get_line_height = function() {
            return line_height
        }

        // ---

        function wrap_text() {
            var line = ""       // current line
            var line_width = 0  // width of current line
            var word_width      // width of current word
            var sep
            var space_width = ctx.measureText(" ").width
            var words = text.split(/([ \n])/)
            for (var i = 0; i < words.length; i += 2) {
                sep = separator()
                wrap_word(words[i - 1] == "\n", words[i])     // Note: words[-1] == undefined
                //
                if (line_width > box_width) {
                    box_width = line_width
                }
            }
            wrapped_lines.push(line)
            box_height = wrapped_lines.length * line_height

            function wrap_word(newline, word) {
                word_width = ctx.measureText(word).width
                if (newline) {
                    begin_new_line(word)
                } else if (line_width + sep.width + word_width <= max_width) {
                    append_to_line(word)
                } else {
                    begin_new_line(word)
                }
            }

            function append_to_line(word) {
                line += sep.char + word
                line_width += sep.width + word_width
            }

            function begin_new_line(word) {
                if (line) {
                    wrapped_lines.push(line)
                }
                line = word
                line_width = word_width
            }

            function separator() {
                return {
                    char:  line ? " " : "",
                    width: line ? space_width : 0
                }
            }
        }
    },



    // ***************
    // *** Network ***
    // ***************



    is_local_connection: function() {
        var hostname = location.hostname
        return hostname == "localhost" || hostname == "127.0.0.1"
    },



    // ***************
    // *** Cookies ***
    // ***************



    set_cookie: function(name, value) {
        /* var days = 2
        var expires = new Date()
        expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000) */
        //
        // DeepaMehta note: the cookie's path must be explicitly set to "/". If not set the browser would set it to
        // "/de.deepamehta.webclient" (the "directory" of the page that loaded this script) and the cookie will not be
        // send back to the server for XHR requests as these are bound to "/core". ### FIXDOC: still true?
        // Vice versa we can't set the cookie's path to "/core" because it would not be accessible here at client-side.
        document.cookie = name + "=" + value + ";path=/" // + ";expires=" + expires.toGMTString()
    },

    /**
     * Returns a cookie value.
     *
     * @param   name    the name of the cookie, e.g. "dm4_workspace_id".
     *
     * @return  the cookie value (string) or undefined if no such cookie exist.
     */
    get_cookie: function(name) {
        // Note: document.cookie contains all cookies as one string, e.g. "dm4_workspace_id=123; dm4_topicmap_id=234"
        if (document.cookie.match(new RegExp("\\b" + name + "=(\\w*)"))) {
            return RegExp.$1
        }
    },

    remove_cookie: function(name) {
        // Note: setting the expire date to yesterday removes the cookie
        var days = -1
        var expires = new Date()
        expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
        //
        document.cookie = name + "=;path=/;expires=" + expires.toGMTString()
    }
}
