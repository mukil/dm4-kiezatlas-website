package de.kiezatlas.website.model;

import de.deepamehta.core.JSONEnabled;
import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.service.ResultList;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

import java.util.logging.Logger;

/**
 * A data-transfer object extending a <code>ka2.bezirk</code> topic to be displayable.
 *
 * @author Malte Reißig (<a href="mailto:malte@mikromedia.de">Contact</a>)
 */
public class BezirkView implements JSONEnabled {

    Logger log = Logger.getLogger(GeoObjectDetailsView.class.getName());

    private Topic topic;
    private JSONObject json = new JSONObject();

    public BezirkView(Topic bezirk) {
    this.topic = bezirk;
    }

    private String getBezirksname() {
        return topic.getSimpleValue().toString();
    }

    private Topic getImprintLink() {
        return this.topic.getRelatedTopic("dm4.core.association", "dm4.core.default", "dm4.core.default", "dm4" +
                ".webbrowser.web_resource");
    }

    private JSONArray getBezirksregionen() {
        JSONArray regionen = new JSONArray();
        ResultList<RelatedTopic> topics = this.topic.getRelatedTopics("dm4.core.association",
            "dm4.core.default", "dm4.core.default", "ka2.bezirksregion", 0);
        for (RelatedTopic item : topics.getItems()) {
            try {
                JSONObject entry = new JSONObject()
                    .put("id", item.getId())
                    .put("name", item.getSimpleValue().toString());
                regionen.put(entry);
            } catch (JSONException ex) {
                throw new RuntimeException("Constructing a Bezirksregione FAILED");
            }
        }
        return regionen;
    }

    public JSONObject toJSON() {
        try {
            Topic link = getImprintLink();
            String imprint = "http://www.kiezatlas.de/impressum";
            if (link != null) {
                imprint = link.getSimpleValue().toString();
            } else if (link == null) {
                log.warning("### Fallback because district \"" + this.topic.getSimpleValue() + "\" has now \"Web " +
                        "Resource\" associated (default, default) which we could use as an IMPRINT!");
            }
            this.json.put("imprint", imprint);
            this.json.put("value", getBezirksname());
            this.json.put("childs", getBezirksregionen());
            this.json.put("uri", this.topic.getUri());
            this.json.put("id", this.topic.getId());
            return this.json;
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a BezirkView FAILED");
        }
    }

}
