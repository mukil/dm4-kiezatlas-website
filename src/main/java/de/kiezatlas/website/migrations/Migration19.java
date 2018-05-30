package de.kiezatlas.website.migrations;

import de.deepamehta.core.Topic;
import de.deepamehta.core.TopicType;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.Migration;
import de.deepamehta.workspaces.WorkspacesService;
import java.util.logging.Logger;

/**
 * Remove geo objects for which users had not gathered consent.
 * @author malted
 */
public class Migration19 extends Migration {

    private Logger log = Logger.getLogger(getClass().getName());

    static final String KIEZATLAS_WORKSPACE_URI = "de.kiezatlas.workspace";
    static final String LOR_NUMMER_TYPE = "ka2.lor_nummer";

    @Inject private WorkspacesService workspaces;

    @Override
    public void run() {
        log.info("### Migration 19 STARTED: Assign View Configuration of topic type \"LOR Nummer\" to Kiezatlas Workspace");
        Topic kiezatlasWs = workspaces.getWorkspace(KIEZATLAS_WORKSPACE_URI);
        TopicType lorNummer = dm4.getTopicType(LOR_NUMMER_TYPE);
        Topic viewConfigTopic = lorNummer.getRelatedTopic("dm4.core.aggregation", "dm4.core.type", "dm4.core.view_config", "dm4.webclient.view_config");
        workspaces.assignToWorkspace(viewConfigTopic, kiezatlasWs.getId());
        log.info("### Migration 19 COMPLETED: Assigned View Configuration of topic type \"LOR Nummer\" to Kiezatlas Workspace");
    }

}
