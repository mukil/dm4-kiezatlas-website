package de.kiezatlas.website.model;

import de.deepamehta.core.JSONEnabled;
import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import java.util.List;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

import java.util.logging.Logger;

/**
 * A data-transfer object extending a <code>ka2.bezirk</code> topic to be displayable.
 *
 * @author Malte Reißig (<a href="mailto:malte@mikromedia.de">Contact</a>)
 */
public class BezirkInfo implements JSONEnabled {

    Logger log = Logger.getLogger(GeoObjectDetailsView.class.getName());

    private Topic topic;
    private JSONObject json = new JSONObject();

    public BezirkInfo(Topic bezirk) {
        this.topic = bezirk;
    }

    public String getBezirksname() {
        return topic.getSimpleValue().toString();
    }

    public Topic getImprintLink() {
        return this.topic.getRelatedTopic("dm4.core.association", "dm4.core.default", "dm4.core.default", "dm4"
            + ".webbrowser.web_resource");
    }

    public Topic getBezirksHTML() {
        return this.topic.getRelatedTopic("dm4.core.association", "dm4.core.default", "dm4.core.default",
            "ka2.website.bezirk_info");
    }

    private JSONArray getBezirksregionen() {
        JSONArray regionen = new JSONArray();
        List<RelatedTopic> topics = this.topic.getRelatedTopics("dm4.core.association",
            "dm4.core.default", "dm4.core.default", "ka2.bezirksregion");
        for (RelatedTopic item : topics) {
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
                log.warning("### Fallback because district \"" + this.topic.getSimpleValue() + "\" has no \"Web "
                    + "Resource\" associated (default, default) which we could use as an IMPRINT!");
            }
            Topic html = getBezirksHTML();
            String body = "<h3>Willkommen auf der Kiezatlas-Seite des Bezirks " + getBezirksname()
                + "</h3><p><a href=\"" + link + "\">Impressum</a></p>";
            if (html != null) {
                body = html.getSimpleValue().toString();
            } else if (html == null) {
                log.warning("### Fallback because district \"" + this.topic.getSimpleValue() + "\" has no "
                    + "\"Bezirk Info Area\" associated (default, default) which we could use as content!");
            }
            this.json.put("imprint", imprint);
            this.json.put("html", body);
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
