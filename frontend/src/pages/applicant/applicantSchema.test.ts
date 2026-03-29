import { getApplicantSchemaSections } from "./applicantSchema";

describe("getApplicantSchemaSections", () => {
  it("filters hidden applicant fields and sorts canonical sections by order", () => {
    const sections = getApplicantSchemaSections({
      sections: [
        {
          id: "second",
          title: "Second Section",
          order: 2,
          visible: true,
          fields: [
            { id: "visible_field", dataKey: "visible_field", type: "number", label: "Visible Field", order: 2 },
            {
              id: "hidden_field",
              dataKey: "hidden_field",
              type: "essay",
              label: "Hidden Field",
              order: 1,
              visibility: { applicant: false, partner: true, staff: true },
            },
          ],
        },
        {
          id: "first",
          title: "First Section",
          order: 1,
          visible: true,
          fields: [
            { id: "first_field", dataKey: "first_field", type: "short-text", label: "First Field", order: 1 },
          ],
        },
      ],
    });

    expect(sections).toHaveLength(2);
    expect(sections[0].id).toBe("first");
    expect(sections[1].id).toBe("second");
    expect(sections[1].fields).toHaveLength(1);
    expect(sections[1].fields[0].id).toBe("visible_field");
  });

  it("preserves builder-style canonical section metadata for the applicant view", () => {
    const sections = getApplicantSchemaSections({
      sections: [
        {
          id: "essays",
          name: "Essays",
          title: "Essay Responses",
          description: "Written prompts for admission review.",
          order: 1,
          visible: true,
          fields: [
            {
              id: "personal_statement",
              dataKey: "personal_statement",
              type: "essay",
              label: "Personal Statement",
              required: true,
              order: 1,
              validation: { wordLimit: 650 },
              visibility: { applicant: true, partner: true, staff: true },
            },
          ],
        },
      ],
    });

    expect(sections).toEqual([
      {
        id: "essays",
        name: "Essays",
        title: "Essay Responses",
        description: "Written prompts for admission review.",
        order: 1,
        visible: true,
        fields: [
          {
            id: "personal_statement",
            dataKey: "personal_statement",
            type: "essay",
            label: "Personal Statement",
            required: true,
            order: 1,
            validation: { wordLimit: 650 },
            visibility: { applicant: true, partner: true, staff: true },
          },
        ],
      },
    ]);
  });
});
