package de.kiezatlas.website.model;

import de.deepamehta.core.JSONEnabled;
import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.service.ResultList;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

import java.util.logging.Logger;

public class BezirksView implements JSONEnabled {

	Logger log = Logger.getLogger(EntryView.class.getName());

	private Topic topic;
	private JSONObject json = new JSONObject();

	public BezirksView(Topic bezirk) {
		this.topic = bezirk;
	}

	private String getBezirksname() {
		return topic.getSimpleValue().toString();
	}

	private long getBezirksId() {
		return topic.getId();
	}

	private String getBezirksURI() { return topic.getUri(); }

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

	private Topic getImprintLink() {
		return this.topic.getRelatedTopic("dm4.core.association", "dm4.core.default", "dm4.core.default", "dm4" +
				".webbrowser.web_resource");
	}

	public JSONObject toJSON() {
		try {
			Topic link = getImprintLink();
			String imprint = "http://www.kiezatlas.de/impressum";
			if (link != null) {
				imprint = link.getSimpleValue().toString();
			} else if (link == null) {
				log.warning("Bezirk \"" + this.topic.getSimpleValue() + "\" has now \"Web Resource\" associated " +
						"(default, default) which we could use as an Imprint!");
			}
			this.json.put("imprint", imprint);
			this.json.put("value", getBezirksname());
			this.json.put("childs", getBezirksregionen());
			this.json.put("uri", getBezirksURI());
			this.json.put("id", getBezirksId());
			return this.json;
		} catch (JSONException ex) {
			throw new RuntimeException("Constructing a Bezirksregione FAILED");
		}
	}

}
