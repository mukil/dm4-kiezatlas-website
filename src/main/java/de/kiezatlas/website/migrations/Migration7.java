package de.kiezatlas.website.migrations;

import de.deepamehta.core.Topic;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.Migration;
import de.deepamehta.plugins.accesscontrol.AccessControlService;
import de.deepamehta.plugins.workspaces.WorkspacesService;
import static de.kiezatlas.website.WebsiteService.CONFIRMATION_WS_URI;



public class Migration7 extends Migration {

    @Inject
    private WorkspacesService workspaceService;

    @Inject
    private AccessControlService acService;

    @Override
    public void run() {
        // 1) Set ADMIN as owner of "Confirmation" workspace
        Topic workspace = workspaceService.getWorkspace(CONFIRMATION_WS_URI);
        acService.setWorkspaceOwner(workspace, AccessControlService.ADMIN_USERNAME);
    }

}